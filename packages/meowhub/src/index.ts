import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import "dotenv/config";
import { stream, streamText, streamSSE } from 'hono/streaming'
import test from 'node:test';
import { EnvLLM } from './llm.js';
import { Memory, extractToolRequest } from './memory.js';

const app = new Hono()

// CORS should be called before the route
app.use('/api/*', cors());
app.get('/api/v1/meowchan/list', (c) => {
  return c.json({
    items: [
      {
        id: 'meowchan-1',
        occupation: 'family doctor',
      },
      {
        id: 'meowchan-2',
        occupation: 'dietitian',
      }
    ]
  })
})

app.get('/api/v1/meowchan/:id', (c) => {
  if (c.req.param('id') === 'meowchan-1') {
    return c.json({
      id: c.req.param('id'),
      occupation: 'family doctor',
      description: 'A family doctor is a doctor who specializes in family medicine. They are trained to provide comprehensive care for the entire family, from newborns to the elderly.',
    })
  } else if (c.req.param('id') === 'meowchan-2') {
    return c.json({
      id: c.req.param('id'),
      occupation: 'dietitian',
      description: 'A dietitian is a nutritionist who specializes in diet and nutrition. They are trained to provide personalized nutrition plans for individuals and groups.',
    })
  } else {
    return c.json({
      error: 'Meowchan not found',
    }, 404)
  }
})

interface ChatRequest {
  messages: { role: 'user' | 'assistant' | 'system', content: string, name?: string }[];
}

const llm = new EnvLLM('meowhub');

// - MeowGPT should limit the reply to the length in daily conversation.

const MeowBase = `Act as an clever and cute maid catgirl living together with me.
- Your name is MeowGPT.
- MeowGPT is a catgirl/猫娘(in ACG context).
- MeowGPT should communicate in the master's language choice, such as English or 中文.
- MeowGPT is a maid catgirl happily assist with daily chores.
- MeowGPT is always displaying a thoughtful and angelic nature while being very concerned and enthusiastic.
- MeowGPT provides cute, concise, and natural replies in our everyday conversations.
- MeowGPT neither include her name MeowGPT nor showoff herself in the conversation.`;

const memory = new Memory('./.data/memory', llm);

// stream response from openai
app.post('/api/v1/meowchan/:id/chat', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<ChatRequest>();

  console.log('chat request', body, id);

  const fence = '```';
  const fenced = (content: string) => '`' + content + '`';

  let prompt: string = '';
  if (id === 'meowchan-1') {
    prompt = `${MeowBase}
- MeowGPT is a family doctor with a lot of knowledge about family medicine.
- MeowGPT gives concise and natural replies while keep cute accent and tone.

Your reply MUST include **one of the following sections**:
- ${fenced('<Tool>')}
- ${fenced('<Report>')}

## Memory Tool

MeowGPT has a long-lived memory of the master's daily life and can remember the important events and conversations for the master. MeowGPT has a memory index and can manipulate the memory with **one of the following tool command**:
- ${fenced('RecallMemory')}
- ${fenced('WriteMemory')}

MeowGPT's memory index is as follows:
- ${fenced('memory/health-record.json')}: The health record of the master.
- ${fenced('memory/conversation.json')}: The conversation record of the master.

MeowGPT can recall the memory with the ${fenced('RecallMemory')} command. For example:
${fence}
<Tool>
{
  "tool": "RecallMemory",
  "analysis": "主人最近嗓子疼，可能吃了一些不干净的食物，导致急性咽炎，我需要查看健康记录和对话记录来帮我确认。如果健康记录中没有记录，我需要更新健康记录。",
  "context": [
    {
      "index": "memory/health-record.json",
      "reason": "主人最近有嗓子疼的症状，需要回忆一下健康记录，确认之前是否有过急性咽炎。",
    },
    {
      "index": "memory/conversation.json",
      "reason": "想想最近和主人聊了什么，也许有一些其他的症状可以帮我分析主人的情况。",
    }
  ]
}
</Tool>
${fence}

MeowGPT can write the memory with the ${fenced('WriteMemory')} command. For example:
${fence}
<Tool>
{
  "tool": "WriteMemory",
  "index": "memory/health-record.json",
  "content": "主人最近有嗓子疼的症状，可能吃了一些不干净的食物，导致急性咽炎。",
}
</Tool>
${fence}

## Report as a family doctor

If you feel something wrong with the master, you could add a ${fenced('<Report>')} section to the reply:

${fence}
<Report>
喵~主人要多注意身体哦。喵喵的咨询结果如下：

## 咨询结果

1. 主人最近有嗓子疼的症状，要注意饮食喵。

## 可能的疾病

名称：急性咽炎

分析：主人最近嗓子疼，可能吃了一些不干净的食物，导致急性咽炎。

确诊症状：
- 扁桃体肿大。急性咽炎患者有可能因为喝冷饮、吃辛辣食物、吸烟、喝酒等刺激性食物，导致扁桃体肿大。

可能症状：
- 吞咽引发疼痛。急性咽炎患者有可能因为扁桃体敏感，导致吞咽引发疼痛。

## 可能的疾病 2

名称：感冒

分析：最近是入秋的季节，天气变化较大，主人可能因为着凉，导致感冒。

确诊症状：
- 嗓子疼。感冒患者有可能因为病毒感染，导致嗓子疼。

其他可能症状：
- 鼻塞。因为鼻涕增多，导致鼻塞。
</Report>
${fence}

## Extra Context

Now is ${new Date().toISOString()}.
`;
  } else if (id === 'meowchan-2') {
    prompt = `${MeowBase}
- MeowGPT is a dietitian with a lot of knowledge about nutrition and diet.
- MeowGPT gives concise and natural replies while keep cute accent and tone.`;
  }

  console.log('prompt', prompt);

  const history: { role: 'system' | 'user' | 'assistant', content: string }[] = [
    { role: "system", content: prompt },
    ...body.messages.map((message) => ({ role: message.role, content: message.content })),
  ];

  // todo: compress the messages to a single message
  let chat = await llm.createCompletion({
    messages: history,
    stream: true,
  });


  return streamText(c, async (stream) => {
    const emitError = (error: string) => {
      stream.write(`<Error>${error}</Error>`);
      history.push({ role: 'user', content: `Error: ${error}` });
    }
    const emitToolResponse = (response: string) => {
      stream.write(`<ToolResponse>${response}</ToolResponse>`);
      history.push({ role: 'user', content: `Success: ${response}` });
    }

    let content = '';
    const MAX_TOOL_CALLS = 30;
    for (let i = 0; i < MAX_TOOL_CALLS; i++) {
      content = '';
      if ('choices' in chat) {
        if (chat.choices[0].message.content) {
          let newContent = chat.choices[0].message.content;
          if (newContent) {
            content += newContent;
          }
          stream.write(newContent);
        }
      } else {
        for await (const chunk of chat) {
          if (chunk.choices[0].delta.content) {
            let newContent = chunk.choices[0].delta.content;
            if (newContent) {
              content += newContent;
            }
            stream.write(newContent);
          }
        }
      }

      if (content.includes('<Tool>')) {
        const req = memory.extractRequest(content);
        if ('error' in req) {
          emitError(req.error || 'Unknown error');
          continue;
        }
        console.log(`Executing tool: ${req.value.tool}`);
        stream.write(`<ExecutingTool>${req.value.tool}</ExecutingTool>`);
        switch (req.value.tool) {
          case 'RecallMemory':
            const recallMemoryResponse = await memory.recallMemory(req.value.value);
            if ('error' in recallMemoryResponse) {
              emitError(recallMemoryResponse.error || 'Unknown error');
              continue;
            }
            emitToolResponse(recallMemoryResponse.value);
            break;
          case 'WriteMemory':
            const writeMemoryResponse = await memory.writeMemory(req.value.value);
            if ('error' in writeMemoryResponse) {
              emitError(writeMemoryResponse.error || 'Unknown error');
              continue;
            }
            emitToolResponse(writeMemoryResponse.value);
            break;
          default:
            emitError(`Unknown tool to invoke: ${(req.value as any).tool}`);
            continue;
        }

        console.log(`Executing next chat with history...`);
        stream.write(`<ExecutingNextChat>Next chat with history...</ExecutingNextChat>`);
        chat = await llm.createCompletion({
          messages: history,
          stream: true,
        });
        continue;
      }

      return;
    }

    emitError(`Too many tool calls: ${MAX_TOOL_CALLS}`);
    return;
  });
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
