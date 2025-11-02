import path from "node:path";
import fs from "node:fs";
import type { LLM } from './llm.js';

export interface RecallMemoryRequest {
    analysis: string;
    context: {
        index: string;
        reason: string;
    }[];
}

export interface WriteMemoryRequest {
    index: string;
    content: string;
}

type ErrorResult = {
    error: string;
}

type Result<T> = {
    value: T;
} | ErrorResult;

const hasError = (result: Result<any>): result is ErrorResult => {
    return 'error' in result;
}

class DirStore {
    defaultIndices = ['memory/health-record.json', 'memory/conversation.json'];

    constructor(public dir: string) {
    }

    public get(index: string): Result<string> {
        if (!this.defaultIndices.includes(index)) {
            return {
                error: `index ${index} is not supported`,
            };
        }
        if (!fs.existsSync(path.join(this.dir, index))) {
            return {
                value: '',
            };
        }
        const content = fs.readFileSync(path.join(this.dir, index), 'utf8');
        return {
            value: content,
        };
    }

    public append(index: string, content: string) {
        const oldContent = this.get(index);
        if ('error' in oldContent) {
            return oldContent;
        }
        content = oldContent.value + content;
        // write tmp then rename
        const tmpPath = path.join(this.dir, index + '.tmp');
        fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
        fs.writeFileSync(tmpPath, content);
        fs.renameSync(tmpPath, path.join(this.dir, index));
        return {
            value: content,
        };
    }
}

type ToolRequest = { tool: 'RecallMemory', value: RecallMemoryRequest } | { tool: 'WriteMemory', value: WriteMemoryRequest };

export function extractToolRequest(request: string): Result<ToolRequest> {
    //    find the first <Tool> and </Tool>
    const toolStart = request.indexOf('<Tool>');
    const toolEnd = request.indexOf('</Tool>');
    if (toolStart === -1 || toolEnd === -1) {
        return {
            error: 'tool request not found',
        };
    }
    if (toolStart >= toolEnd) {
        return {
            error: 'tool request is not in format <Tool>...</Tool>',
        };
    }
    const tool = request.substring(toolStart + 6, toolEnd);
    try {
        const toolJson = JSON.parse(tool) as Partial<{ tool: 'RecallMemory' | 'WriteMemory' }>;
        if (!toolJson.tool) {
            return {
                error: 'tool is required. Expected "RecallMemory" or "WriteMemory"',
            };
        }
        return {
            value: {
                tool: toolJson.tool,
                value: toolJson as any,
            },
        };
    } catch (error) {
        return {
            error: `invalid tool request format: ${error}`,
        };
    }
}

export class Memory {

    private dir: DirStore;

    constructor(dir: string, private llm: LLM) {
        this.dir = new DirStore(dir);
    }

    public extractRequest(request: string): Result<ToolRequest> {
        const toolRequest = extractToolRequest(request);
        if (hasError(toolRequest)) {
            return toolRequest;
        }
        switch (toolRequest.value.tool as string) {
            case 'RecallMemory':
                return this.validateRecallMemoryRequest(toolRequest.value.value as RecallMemoryRequest);
            case 'WriteMemory':
                return this.validateWriteMemoryRequest(toolRequest.value.value as WriteMemoryRequest);
            default:
                return { error: `unknown tool: ${toolRequest.value.tool}` };
        }
    }

    public validateRecallMemoryRequest(request: Partial<RecallMemoryRequest>): Result<ToolRequest> {
        try {
            const errors = [];
            if (!request.analysis) {
                errors.push('analysis is required');
            } else if (typeof request.analysis !== 'string') {
                errors.push('analysis must be a string');
            }
            if (!request.context) {
                errors.push('context is required');
            } else if (!Array.isArray(request.context)) {
                errors.push('context must be an array');
            } else {
                request.context.forEach(context => {
                    if (!context.index) {
                        errors.push('index is required');
                    } else if (typeof context.index !== 'string') {
                        errors.push('index must be a string');
                    }
                    if (!context.reason) {
                        errors.push('reason is required');
                    } else if (typeof context.reason !== 'string') {
                        errors.push('reason must be a string');
                    }
                });
            }

            return {
                value: {
                    tool: 'RecallMemory',
                    value: request as RecallMemoryRequest,
                },
            };
        } catch (error) {
            return {
                error: `invalid request format: ${error}`
            }
        }
    }

    public validateWriteMemoryRequest(request: WriteMemoryRequest): Result<ToolRequest> {
        try {
            const errors = [];
            if (!request.index) {
                errors.push('index is required');
            } else if (typeof request.index !== 'string') {
                errors.push('index must be a string');
            }
            if (!request.content) {
                errors.push('content is required');
            } else if (typeof request.content !== 'string') {
                errors.push('content must be a string');
            }
            return {
                value: {
                    tool: 'WriteMemory',
                    value: request,
                },
            };
        } catch (error) {
            return {
                error: `invalid request format: ${error}`
            }
        }
    }

    public async recallMemory(request: RecallMemoryRequest) {
        const errors = [];
        const responses: string[] = [];
        for (const context of request.context) {
            const content = this.dir.get(context.index);
            if (hasError(content)) {
                errors.push(`Cannot get index ${context.index}: ${content.error}`);
                continue;
            }
            const response = await this.llm.createCompletion({
                messages: [
                    { role: 'system', content: 'You are a memory assistant. You are responsible for recalling memory from the memory index. You should reply in the same language as the request.' },
                    { role: 'user', content: `The recalled content is: ${content.value}` },
                    { role: 'user', content: `Please think with the memory and summarize the content with the request in markdown format. The request is: ${request.analysis}` },
                ],
                stream: true,
            });
            responses.push(`## Index ${context.index}`);
            let contentStr = '';
            if ('choices' in response) {
                if (response.choices[0].message.content) {
                    contentStr += response.choices[0].message.content;
                }
            } else {
                for await (const chunk of response) {
                    if (chunk.choices[0].delta.content) {
                        contentStr += chunk.choices[0].delta.content;
                    }
                }
            }
            responses.push(contentStr);
        }
        if (errors.length > 0) {
            return { error: errors.join('\n') };
        }
        return {
            value: responses.join('\n'),
        };
    }

    public async writeMemory(request: WriteMemoryRequest) {
        const content = this.dir.append(request.index, request.content);
        if (hasError(content)) {
            return content;
        }
        return {
            value: 'Write memory successfully',
        };
    }
}
