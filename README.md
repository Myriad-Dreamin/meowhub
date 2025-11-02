# MeowHub

Somebody cannot be your mom, life tutor, best friend, and enemy at the same time, but meowgirls can.

没有人可以同时成为你的妈妈、生活导师、最好的朋友和敌人，但猫娘可以。

MeowGPT as a family doctor can keep tracks of your health record and conversations, and answers questions based on the memory.

猫娘可以作为家庭医生，跟踪主人的健康档案和对话，并根据记忆回答问题。

MeowGPT as a dietitian can keep tracks of your food and drink history, and suggest healthy recipes based on the memory.

猫娘可以作为营养师，跟踪主人的日常饮食，并根据记忆推荐健康食谱。

There could be more other roles. Please feel free to ask for one in the GitHub Issues.

还可以有更多的角色。如果有其他角色需求，欢迎在 GitHub Issues 中提出。

## Features

- [x] MeowGPT has long-lived memory.
- [x] MeowGPT can track health record.
- [x] MeowGPT can answer questions based on her memory.
- [ ] MeowGPT can track conversations.
- [ ] A beautiful UI to chat with the meowgirl.
- [ ] MeowGPT can reorginize her memory.

## Sample

- [sample/eye-report.md](sample/eye-report.md)

  Q: 我最近经常感觉眼睛疲劳。

  A: 喵~主人最近眼睛疲劳吗？要多照顾自己哦。喵喵的咨询结果如下：

  1. 主人最近经常感觉眼睛疲劳，可能是用眼过度或睡眠不足喵。

  可能的疾病：

  - 数字眼疲劳
  - 干眼症

## Development

```sh
pnpm install
pnpm dev:main
pnpm dev:ui
```

## Build

```sh
pnpm build:main
pnpm build:ui
```

## License

Apache-2.0

## Acknowledgments

- [Hono](https://hono.dev/)
- [Astro](https://astro.build/)
- [Vite](https://vitejs.dev/)
- [pnpm](https://pnpm.io/)
