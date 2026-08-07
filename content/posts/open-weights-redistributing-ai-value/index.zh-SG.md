---
title: "开放权重之后，模型公司开始重新分蛋糕"
description: "从 Kimi K3 的大型 MaaS 协议、Qwen 可能采用的收益分享、DeepSeek API 涨价预告与 GPT-5.6 Luna 降价，观察模型能力扩散后价值如何在研发、托管与应用层之间重新分配。"
date: "2026-08-07"
updated: "2026-08-07"
translationKey: "open-weights-redistributing-ai-value"
tags: ["开放权重", "Kimi K3", "Qwen", "DeepSeek", "OpenAI", "MaaS", "AI 商业模式"]
category: "AI 观察"
draft: false
cover: "https://pictor.js.gripe/i/ea34ce2b-6414-44c8-a4ea-7890720c9100/public.png"
---

过去几年，开放权重最有吸引力的一点，并不只是模型可以下载。

真正发生变化的是，一部分原本集中在基础模型公司的价值创造能力被分散了出去。

模型权重下发以后，云计算公司可以提供托管，推理服务商可以通过量化、缓存、批处理和 kernel 优化降低成本，企业可以建立私有部署，开发者可以继续微调并构建自己的应用。基础模型由一家公司的产品，逐渐变成更多公司可以继续加工的生产资料。

这也是此前讨论开放权重时，我更在意的“把蛋糕分给更多人”。

但到了 2026 年，这件事出现了新的后半段。

Kimi K3 开始要求达到一定规模的 MaaS 服务商重新签订商业协议，实际合作中已经出现收入分成；阿里据报也准备在下一代 Qwen 中采取类似方式。DeepSeek 则在维持开放权重的同时，明确预告官方 API 将大幅涨价。

另一边，OpenAI 却在把 GPT-5.6 Luna 的 API 价格一次下调 80%，随后又把 Luna 下放为 ChatGPT 免费用户的默认模型。

这些动作放在一起看，真正发生的并不是简单的价格战。

**开放权重公司在模型完成大规模扩散以后，开始寻找把收入重新送回研发端的方法；OpenAI 则利用封闭模型的全栈控制和巨大调用规模，把基础智能主动做成越来越便宜的入口。**

AI 模型竞争由此从“谁愿意把模型放出来”，进入了“模型产生的价值到底由谁来分”的阶段。

<!--more-->

## 一、开放权重先把蛋糕做大

Kimi K2.5 很能代表开放权重早期的逻辑。

它采用 Modified MIT License，基本保留了使用、复制、修改、发布、分发、再许可和销售模型及衍生作品的自由。真正针对超大商业产品增加的条件，主要是品牌展示。

授权条款写道：

> “you shall prominently display ‘Kimi K2.5’ on the user interface of such product or service.”

中文可以译为：

> “你应当在该产品或服务的用户界面上显著展示‘Kimi K2.5’。”

这个要求只在产品超过 1 亿月活，或者月收入超过 2000 万美元时触发。

这里并不存在“你用了我的模型赚钱，就必须按照收入向我交一部分”的关系。

这实际上给了下游很大的商业空间。

一家推理平台可以取得模型以后建设自己的 GPU 集群，再靠更好的调度和推理优化赚钱；企业可以自己部署，避免把敏感数据发送到公共 API；应用公司可以把模型能力包装成更具体的软件产品。

模型研发公司得到的是影响力和生态，其他参与者则分别从算力、部署、优化和应用中取得收益。

开放权重由此产生了一种与封闭 API 不同的产业结构：

**模型公司创造基础能力，但不再自动取得这项能力以后产生的全部收入。**

这也是“把蛋糕分出去”真正发生的地方。

对于个人和企业用户而言，得到的也不只是便宜。

同一个模型可以由多个服务商提供，也可以部署在自己的基础设施。如果一个 API 服务商涨价或者停止服务，更换服务商并不意味着必须连底层模型一起更换。

开放权重分散的不只是收入，还包括部署权、优化权和退出权。

## 二、Kimi K3 开始修改分钱规则

到了 Kimi K3，Moonshot 没有把已经分出去的权重重新收回来。

K3 仍然是一款开放权重模型，Moonshot 官方仓库将其描述为一款 2.8T 参数、104B 激活参数的开放权重多模态 Agent 模型。

真正发生变化的是授权条款。

K3 对 Model as a Service，也就是 MaaS，增加了专门规定。按照授权条款定义，这主要指向第三方提供模型推理或者微调能力，并让客户能够实际控制输入、参数或者训练数据的服务。普通终端产品只是把模型嵌入某项具体功能，并不会因此自动成为 MaaS。

当一家经营 MaaS 的企业及其关联公司在连续 12 个月内总收入超过 2000 万美元以后，授权条款规定：

> “the Licensee must enter into a separate agreement with Moonshot AI”

中文即：

> “被许可方必须与 Moonshot AI 另行签订协议。”

这份协议需要在继续将 K3 或其衍生作品用于商业用途之前完成。

内部使用则被明确排除在这一要求之外。

这个边界很重要。

一家企业把 K3 部署在内部做知识检索，与一家云平台直接出售 K3 推理 API，是两种不同的商业行为。

Moonshot 现在真正想收费的，是后者。

换句话说，K3 没有取消其他参与者分蛋糕的资格，而是开始要求那些**直接把基础模型本身变成大规模生意的人重新和模型研发者分钱。**

## 三、“最高 30%”意味着研发方开始重新进入价值链

K3 公共授权条款没有写死统一的收入分成比例，它只规定达到条件的大型 MaaS 需要另外签署协议。

真正的分成数字来自已经开始形成的商业合作。

Reuters 8 月 7 日援引消息人士报道称，Moonshot 在部分合作中要求：

> “up to a 30% revenue share”

即：

> “收入分成最高可达到 30%。”

这是部分商业协议的条件，不是所有 K3 用户统一面对的授权费。

中软国际已经披露与 Moonshot 存在收入分成协议，但没有公布具体百分比。

DigitalOcean CEO Paddy Srinivasan 也确认公司与 Moonshot 存在商业协议。

这一步的意义其实比“30% 高不高”更大。

开放权重原来解决的是模型能力如何从一家公司的服务器中走出去。

现在开始解决的是，**能力走出去以后，训练模型的人还能从哪里获得下一代模型的研发资金。**

如果一个实验室承担模型训练、数据处理、后训练和研究人员成本，模型发布以后却由另一家公司建立 GPU 集群、包装成 API，再形成数千万美元甚至更大的业务，基础研发与下游商业收入之间会逐渐脱节。

K3 给出的答案不是重新封闭模型，而是在大型模型转售层增加一个价值回流口。

这实际上补上了开放权重商业模式过去最薄弱的一环。

## 四、Qwen 跟进后，这已经不是一家公司的试验

如果这种模式只出现在 Kimi，仍然可以理解成 Moonshot 自己的一次授权条款实验。

但阿里已经准备往相同方向走。

Reuters 报道称，阿里计划要求下一代 Qwen 开放模型的主要商业用户，分享利用模型产生的一部分收入。

此前阿里主要在模型运行于阿里云时收费，而客户把多数开放模型部署到自己的数据中心以后，不需要继续向阿里支付模型使用费用。

新的制度如果按报道落地，就意味着收费边界会从“谁替你运行模型”进一步延伸到“谁提供了这个模型本身”。

这也说明中国开放权重模型正在进入一个很明显的商业阶段：

早期先把模型免费或者极低成本送进市场；

形成开发者、云服务商和企业部署生态；

随后再针对重度商业使用、提前访问、深度合作和大型 MaaS 收费。

Reuters 在报道中将这种模式概括为一种已经在硅谷反复使用的 freemium 路线。

开放权重因此开始从单纯的发布策略，变成一种真正需要设计收益分配的产业结构。

## 五、DeepSeek 涨价，更像是低价扩张期结束

DeepSeek 走的是另一条路线。

截至 8 月 7 日，V4-Flash 的官方 API 价格仍然只有每百万输入 token 0.14 美元、输出 token 0.28 美元；V4-Pro 分别是 0.435 美元和 0.87 美元。

这个价格低到什么程度，Artificial Analysis 的测试给出了一个比较直观的参照。

Reuters 报道称，V4-Flash 完成其基准测试的平均模型费用约为 0.03 美元，是当时知名模型中运行费用最低的一档。

DeepSeek 随后却在官方价格页写道：

> “We plan to raise the overall pricing for DeepSeek API services in the near future, with a significant increase expected.”

中文即：

> “我们计划近期整体提高 DeepSeek API 服务价格，预计涨幅较大。”

截至目前，新价格还没有正式公布。

从 DeepSeek 过去的定价变化看，这次涨价最合理的解释并不是模型突然变得更昂贵，而是**极低 API 价格已经完成了它最重要的市场任务。**

低价最初不仅是在出售 token，也是在购买市场份额。

当 API 足够便宜，开发者尝试一个新模型的成本就会大幅降低；应用从其他模型迁移过来的阻力也会下降。再加上 V4 本身已经公开权重，DeepSeek 能够同时依靠官方超低价 API 和第三方部署迅速扩大生态。

V4-Flash 正是这条路线的典型产品。DeepSeek 在 V4 发布时直接将其定位为快速、高效、经济的版本，同时公开了 V4 权重。

现在生态已经形成，官方 API 就不必永久承担补贴整个市场的任务。

## 六、DeepSeek 过去已经把价格当作供需调节工具

V4-Pro 今年的价格变化进一步说明这一点。

V4 刚发布时，Pro 的价格最高可以达到 Flash 的约 12 倍。DeepSeek 当时给出的原因是：

> “constraints in high-end compute capacity”

即：

> “高端算力容量受限。”

DeepSeek 还表示，随着华为 Ascend 950 Supernode 在下半年大量供应，Pro 价格预计会明显下降。

到了 5 月，DeepSeek 果然把 V4-Pro 原本的 75% 折扣永久化，使价格降到最初水平的大约四分之一。

这说明 DeepSeek 的 API 价格本来就不是静态的“计算成本加固定利润”。

它同时承担着调节算力需求、扩大用户规模和提高设备利用效率的作用。

今天 V4-Flash 的官方并发限制是 2500，V4-Pro 是 500。

一个价格极低、调用规模迅速扩张的模型，提高价格自然能够同时完成两件事情：

一方面提高每单位算力带来的收入；

另一方面把极度价格敏感的大规模调用推向第三方托管或者自行部署。

而开放权重恰好给了 DeepSeek 这么做的空间。

用户离开 DeepSeek 官方 API，并不等于离开 DeepSeek 模型。

因此，**DeepSeek 现在可以开始让官方托管服务恢复利润，而继续让开放权重承担模型扩散。**

这就是它与完全封闭模型最大的不同。

## 七、OpenAI 为什么反而可以把 Luna 降价 80%

OpenAI 现在走向了相反方向。

GPT-5.6 Luna 没有开放权重。用户无法把 Luna 下载下来，然后交给任意云服务商托管。

因此，OpenAI 想让 Luna 获得足够大的使用规模，就必须让官方入口本身具有足够强的吸引力。

7 月 30 日，OpenAI 直接宣布：

> “Starting today, GPT-5.6 Luna, our fastest and most affordable model, will cost 80% less.”

中文可以译为：

> “从今天开始，GPT-5.6 Luna——我们速度最快、价格最低的模型——价格将降低 80%。”

降价以后，Luna 的 API 价格变成每百万输入 token 0.20 美元、输出 token 1.20 美元。

OpenAI 之所以有能力做这样的价格调整，首先因为它已经不再只是优化模型本身。

它正在优化从模型到最终 token 输出的整套端到端技术体系。

官方披露，更好的路由提高硬件利用率，生产软件优化提高 token 生成效率，上下文管理则减少 Agent 重复已经完成的工作。

GPT-5.6 Sol 甚至被用于优化 OpenAI 自己的生产 kernel，这些工作帮助端到端 serving 成本降低约 20%，相关实验又使 token 生成效率提高超过 15%。

这意味着 OpenAI 的成本优势已经不仅来自“训练一个更小的模型”。

它来自模型、kernel、调度、缓存、上下文管理和基础设施一起优化。

## 八、OpenAI 真正拥有的是规模化集中调度能力

OpenAI 还能做一件开放权重实验室很难单独做到的事：把巨大调用量统一放进自己的基础设施中调度。

OpenAI 明确表示，其计算策略会针对不同 workload 匹配最适合运行它们的系统。

低成本端由 Luna 和 Terra 承担大规模日常工作；高价值端则继续由 Sol 和更昂贵的 Fast mode 提供服务。

Sol 的普通价格并没有随着 Luna 一起下降，而 Fast mode 甚至按照 Standard 两倍价格提供最高约 2.5 倍速度。

这说明 OpenAI 并没有简单地把所有智能一起廉价化。

它是在做价格分层。

大量普通任务进入 Luna；

需要更高能力的工作进入 Terra；

高价值复杂推理继续由 Sol 收取溢价；

对延迟特别敏感的客户还能继续购买更昂贵的 Fast mode。

因此，Luna 没有必要独自承担 OpenAI 整个模型体系的价值回收。

**OpenAI 卖的已经不再只是一个模型，而是一整条按照智能、速度和成本分层的计算产品线。**

这给了它更大的降价空间。

## 九、免费的 Luna 也是一种商业武器

OpenAI 随后又把这种低价路线推进到了 ChatGPT 免费层。

8 月 6 日官方宣布：

> “For Free users, we're updating the default model to GPT-5.6 Luna and expanding access with unlimited text chats.”

中文可以译为：

> “对于 Free 用户，我们正在把默认模型更新为 GPT-5.6 Luna，并开放不限次数的文本聊天。”

Luna 会成为 Free 和 Go 用户的默认模型，普通文本聊天进一步放宽，但文件、图片和其他工具仍然存在独立限制。

这意味着 Luna 已经不只是一个廉价 API。

它还是 OpenAI 获得用户、保持用户和扩大整个产品生态使用量的入口。

这正好对应开放权重模型给 OpenAI 带来的压力。

DeepSeek、Kimi 和 Qwen 可以告诉开发者：

模型能够带走；

可以自己部署；

也可以选择其他推理服务商。

OpenAI 无法给 Luna 提供同样的选择。

它的回答是把“不能带走”变得没有那么重要：

**如果官方服务已经足够便宜、足够方便，大部分普通用户和中小开发者就没有必要为了降低一点 token 成本，自行购买 GPU、维护推理框架和解决扩缩容问题。**

因此，Luna 的降价并不只是技术成本下降后的让利。

它同时是封闭模型面对开放权重生态时的一种竞争策略。

## 十、DeepSeek 涨价和 OpenAI 降价其实来自两个不同起点

于是一个看起来很反常的局面出现了。

开放权重的 DeepSeek 开始提高官方 API 价格。

封闭的 OpenAI 却开始大幅降低 Luna 的价格。

这并不矛盾。

DeepSeek 已经完成了最重要的一步：模型已经走出去。

V4 权重可以进入第三方平台、企业服务器和其他推理基础设施，所以 DeepSeek 没有必要永远亲自提供全市场最低价的托管服务。

官方 API 可以开始承担更多利润回收功能。

OpenAI 则正好相反。

Luna 无法脱离 OpenAI 控制的基础设施自由传播，所以 OpenAI 必须主动把集中式服务做得足够便宜。

双方实际上从两个不同方向走向了同一个位置：

**DeepSeek 正在把过低的官方托管价格向正常商业价格拉回。**

**OpenAI 正在把过去较昂贵的封闭模型调用价格压向开放模型的成本区间。**

过去“开放模型便宜、闭源模型昂贵”的简单区分因此开始失效。

## 十一、Kimi 和 Qwen 则选择从第三方赚到的钱里回收研发成本

DeepSeek 选择提高官方托管价格。

Kimi 则更进一步：权重可以继续下发，但当第三方利用这些权重经营足够大的模型服务业务以后，模型研发者直接参与收益分配。

阿里也正在向这个方向靠近。

这几种方式放在一起，实际上已经出现了三套不同的价值回收机制。

DeepSeek 的模式是：

**模型开放，官方 API 从极低价逐渐恢复商业利润。**

Kimi 正在形成的模式是：

**模型开放，普通使用继续低门槛，大型 MaaS 与研发者分成。**

OpenAI 的模式则是：

**模型不开放，由原厂控制全部推理入口，把基础层价格压低，再通过不同能力档位、速度和工具体系完成价值回收。**

它们争夺的不是同一种收入。

它们在决定**整条 AI 产业链里的收费口应该放在哪里。**

## 十二、开放权重真正进入了第二阶段

这也让最初“开放权重把蛋糕分给更多人”的判断有了新的后半部分。

第一阶段的重点是把蛋糕做大。

权重发布以后，更多云服务商、推理服务商、应用开发者和企业都能参与。

基础模型公司主动让出一部分对产业链的控制，换来更快的传播、更广的部署和更大的生态。

第二阶段开始解决的是怎么分钱。

模型实验室不可能永远依靠融资承担巨额研发成本；

云服务商不可能把全部收入交回模型公司；

推理服务商必须保留足够利润去优化基础设施；

应用开发者也需要保留模型之上的价值。

所以开放权重最终不会走向“所有东西永远免费”。

它更可能走向一种新的分层：

基础研究和普通使用保持开放；

企业内部部署保持自由；

应用层继续允许开发者创造自己的价值；

而真正依靠基础模型本身产生巨大商业收入的环节，开始承担更多上游研发费用。

Kimi K3 和 Qwen 正在探索的是这套分配规则。

DeepSeek 则选择先从自己的 API 开始回收。

## 十三、真正的竞争已经不只是模型性能

这一变化最后会落到开发者和用户身上。

过去选择模型时，主要比较能力、速度和 token 单价。

以后授权条款也会成为模型竞争力的一部分。

同样性能的两个开放权重模型，一个允许商业托管自由竞争，另一个要求达到一定规模后分成，第三方服务商最终会把授权条款成本算进价格。

同样价格的一个开放模型和一个封闭模型，前者能够自行部署，后者如果提供更成熟的工具、基础设施和极低 API 成本，也可能让自行部署失去经济意义。

因此模型竞争越来越像一笔总账：

性能；

推理成本；

基础设施效率；

商业授权条款；

部署自由度；

第三方服务商数量；

工具生态；

以及未来离开当前平台需要付出的迁移成本。

单独拿出“开源”“免费”或者“每百万 token 多少钱”，已经越来越难解释真正的选择。

## 结语：蛋糕分出去之后，开始讨论怎么长期分

开放权重最早带来的变化，是让先进模型不再只能留在少数公司的服务器里。

模型进入更多云平台、企业和开发者产品以后，原本高度集中的价值链被拆开了。基础模型公司、云服务商、推理服务商和应用开发者都可以从不同环节获得收入。

这块蛋糕因此确实被做大，也被分给了更多人。

现在出现的新变化，是训练模型的人开始重新进入已经扩大的价值链。

Kimi 通过大型 MaaS 商业协议参与下游收入；

Qwen 据报准备采用类似机制；

DeepSeek 开始结束极低 API 价格承担的扩张任务；

OpenAI 则利用全栈优化和巨大规模，把封闭模型的基础使用价格继续向下压。

这里没有哪一种模式天然属于最终答案。

但产业方向已经发生了变化：

**开放权重的竞争不再只是“谁愿意把模型放出来”，而是“放出来以后，谁能建立一套让更多人继续分蛋糕，同时还能让训练下一代模型的人拿到钱的规则”。**

而 OpenAI 提出的另一种答案，则是在权重不下发的情况下，把集中式服务便宜到足以与开放生态竞争。

一边开始从已经分出去的价值中重新取回一部分。

另一边开始主动放弃基础智能原本能够获得的价格溢价。

看起来是涨价与降价的反方向移动，背后却是同一件事：

**模型能力正在越来越便宜，真正重新定价的是控制权、基础设施、商业分发和整个生态的位置。**

*封面以 [Medcom 的 Kimi K3 发布会照片](https://www.medcom.id/teknologi/news-teknologi/4ba1wEBb-ada-model-ai-baru-dari-china-moonshot-kimi-k3-penantang-gpt-dan-claude)、Reuters 报道所用的 [Qwen](https://www.marketscreener.com/news/alibaba-to-integrate-qwen-ai-with-taobao-launch-agentic-shopping-source-says-ce7f5bd8da88f423)、[DeepSeek](https://finance.yahoo.com/sectors/technology/articles/china39s-deepseek-to-make-permanent-75-price-cut-on-flagship-v4pro-ai-model-133313442.html) 与 [OpenAI](https://finance.yahoo.com/technology/ai/articles/openai-cuts-prices-smaller-models-170107549.html) 新闻图片为参考重新绘制；中央 API 与资金流表示开放权重、部署服务和模型定价之间的价值重新分配，不代表具体金额或市场数据。*

---

## 参考资料与在线链接

1. **Moonshot AI — Kimi K2.5 License**
   [https://github.com/MoonshotAI/Kimi-K2.5/blob/master/LICENSE](https://github.com/MoonshotAI/Kimi-K2.5/blob/master/LICENSE)

2. **Moonshot AI — Kimi K3 Repository**
   [https://github.com/MoonshotAI/Kimi-K3](https://github.com/MoonshotAI/Kimi-K3)

3. **Moonshot AI — Kimi K3 License**
   [https://github.com/MoonshotAI/Kimi-K3/blob/main/LICENSE](https://github.com/MoonshotAI/Kimi-K3/blob/main/LICENSE)

4. **Reuters — Alibaba plans to charge big users of its next open-source AI model, sources say，2026-08-07**
   [https://www.reuters.com/business/retail-consumer/alibaba-plans-charge-big-users-its-next-open-source-ai-model-sources-say-2026-08-07/](https://www.reuters.com/business/retail-consumer/alibaba-plans-charge-big-users-its-next-open-source-ai-model-sources-say-2026-08-07/)

5. **DeepSeek — DeepSeek V4 Preview Release**
   [https://api-docs.deepseek.com/news/news260424/](https://api-docs.deepseek.com/news/news260424/)

6. **DeepSeek — Models & Pricing**
   [https://api-docs.deepseek.com/quick_start/pricing/](https://api-docs.deepseek.com/quick_start/pricing/)

7. **Reuters — DeepSeek's new AI model is by far the cheapest of well-known models to run, research firm says，2026-08-03**
   [https://www.reuters.com/business/retail-consumer/deepseeks-new-ai-model-is-by-far-cheapest-well-known-models-run-research-firm-2026-08-03/](https://www.reuters.com/business/retail-consumer/deepseeks-new-ai-model-is-by-far-cheapest-well-known-models-run-research-firm-2026-08-03/)

8. **Reuters — China's DeepSeek to make permanent 75% price cut on flagship V4-Pro AI model，2026-05-23**
   [https://www.reuters.com/world/china/chinas-deepseek-make-permanent-75-price-cut-flagship-v4pro-ai-model-2026-05-23/](https://www.reuters.com/world/china/chinas-deepseek-make-permanent-75-price-cut-flagship-v4pro-ai-model-2026-05-23/)

9. **OpenAI — Advancing the price-performance frontier with GPT-5.6，2026-07-30**
   [https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/](https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/)

10. **OpenAI — Improving GPT-5.6 Sol in ChatGPT—and expanding access to GPT-5.6 Luna for free users，2026-08-06**
    [https://openai.com/index/improving-gpt-5-6-sol-in-chatgpt/](https://openai.com/index/improving-gpt-5-6-sol-in-chatgpt/)
