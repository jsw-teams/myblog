---
title: "After Open Weights, Model Companies Are Redistributing the Pie"
description: "Kimi K3's MaaS agreements, Qwen's reported revenue-sharing plans, DeepSeek's API price warning, and GPT-5.6 Luna's price cut show how value is being redistributed across AI research, hosting, and applications."
date: "2026-08-07"
updated: "2026-08-07"
translationKey: "open-weights-redistributing-ai-value"
tags: ["Open Weights", "Kimi K3", "Qwen", "DeepSeek", "OpenAI", "MaaS", "AI Business Models"]
category: "AI Observations"
draft: false
cover: "https://pictor.js.gripe/i/ea34ce2b-6414-44c8-a4ea-7890720c9100/public.png"
---

For the past several years, the appeal of open weights has involved more than being able to download a model.

The deeper change was that some of the capacity to create value, previously concentrated inside foundation-model companies, moved outward. Once weights were released, cloud companies could host them, inference providers could reduce costs through quantization, caching, batching, and kernel optimization, enterprises could deploy them privately, and developers could fine-tune them and build applications of their own. A model stopped being only one company's product and became productive infrastructure that many companies could continue to develop.

This is what I meant when I previously described open weights as “sharing the pie with more people.”

By 2026, however, a second part of that story was emerging. Kimi K3 began requiring MaaS providers above a certain scale to negotiate separate commercial agreements, with revenue sharing already appearing in some partnerships. Alibaba was reportedly considering a similar approach for the next Qwen generation. DeepSeek kept its weights open while warning that its official API prices would rise significantly.

OpenAI moved in the opposite direction. It cut GPT-5.6 Luna API prices by 80% and later made Luna the default model for free ChatGPT users.

Taken together, these decisions are not simply a price war.

**Open-weight developers are looking for ways to return revenue to research after their models have spread widely. OpenAI is using control of the full closed-model stack and enormous request volume to turn basic intelligence into an increasingly inexpensive entry point.**

Competition is moving from “who will release a model?” to “who gets to share the value the model creates?”

<!--more-->

## 1. Open weights first made the pie larger

Kimi K2.5 illustrates the original open-weight logic. Its Modified MIT License largely preserved the freedom to use, copy, modify, publish, distribute, sublicense, and sell the model and derivative works. The principal additional obligation for extremely large commercial products was attribution.

Products with more than 100 million monthly active users or more than $20 million in monthly revenue had to display the Kimi K2.5 name prominently. The license did not establish a general rule that anyone earning money from the model owed Moonshot a percentage of that revenue.

That left substantial room for downstream businesses. An inference platform could obtain the model, build its own GPU cluster, and earn money through better scheduling and serving. An enterprise could deploy it privately without sending sensitive data to a public API. An application company could package the model's capabilities into more specific software.

The model developer gained reach and an ecosystem; other participants earned revenue from compute, deployment, optimization, and applications.

**The foundation-model company created the underlying capability but no longer automatically captured all the revenue produced above it.**

For users, the benefit was not only lower cost. The same model could be offered by several providers or run on infrastructure the user controlled. If one API raised prices or disappeared, changing providers did not necessarily mean changing the underlying model. Open weights distributed deployment rights, optimization rights, and the practical right to leave alongside revenue.

## 2. Kimi K3 changes the sharing rules

Moonshot did not withdraw the weights with Kimi K3. Its official repository describes K3 as an open-weight, multimodal agent model with 2.8 trillion total parameters and 104 billion active parameters.

What changed was the license. K3 adds a specific provision for Model as a Service, or MaaS. The definition primarily covers third parties that expose model inference or fine-tuning while allowing customers meaningful control over inputs, parameters, or training data. A normal end-user product does not automatically become MaaS merely because a model powers one of its features.

When a MaaS operator and its affiliates exceed $20 million in aggregate revenue during any consecutive 12-month period, the license says the operator must enter a separate agreement with Moonshot before continuing commercial use of K3 or its derivatives. Internal use is expressly excluded.

That distinction matters. An enterprise deploying K3 internally for retrieval is not performing the same commercial activity as a cloud platform selling access to K3 inference itself.

Moonshot is not charging everyone who builds with the model. It is seeking payment from businesses that turn access to the foundation model into a large MaaS operation.

## 3. “Up to 30%” brings the research lab back into the value chain

The public K3 license does not set a universal revenue-share percentage. It requires qualifying MaaS companies to negotiate a separate agreement.

The numbers come from commercial arrangements that are beginning to form. Reuters reported on August 7 that Moonshot had sought revenue shares of up to 30% in some partnerships. This was a condition in particular agreements, not a standard royalty applied to every K3 user.

Chinasoft International has disclosed that its arrangement with Moonshot includes revenue sharing without publishing the percentage. DigitalOcean CEO Paddy Srinivasan has also confirmed a commercial agreement with Moonshot.

The significance is larger than whether 30% is high or low. Open weights answered how a capability could leave one company's servers. The new question is how the people who trained that capability can fund the next model after it leaves.

If one laboratory pays for training, data work, post-training, and researchers while another company packages the released weights into an API business worth tens of millions of dollars, research costs and downstream income can drift apart. K3's answer is not to close the model again, but to add a return channel at the large-scale resale layer.

## 4. If Qwen follows, this is no longer one company's experiment

Moonshot's approach could be dismissed as an isolated licensing experiment if it stopped with Kimi. Reuters reported that Alibaba plans to ask major commercial users of its next open Qwen model to share part of the revenue they generate from it.

Alibaba previously earned money mainly when customers ran models on Alibaba Cloud. Customers deploying many open models in their own data centers did not continue paying Alibaba for model usage. If the reported policy takes effect, the charging boundary would extend from “who runs the model for you?” to “who supplied the model itself?”

This suggests that Chinese open-weight developers are entering a more explicitly commercial phase: release models free or at very low cost, build adoption among developers, cloud providers, and enterprises, and then charge for heavy commercial use, early access, deeper partnerships, or large MaaS operations.

Open weights are becoming more than a release strategy. They are becoming an industrial structure whose distribution rules must be designed.

## 5. DeepSeek's planned increase looks like the end of a subsidized expansion phase

As of August 7, DeepSeek's official prices remained exceptionally low. V4-Flash cost $0.14 per million uncached input tokens and $0.28 per million output tokens; V4-Pro cost $0.435 and $0.87 respectively.

Artificial Analysis offered a useful benchmark. Reuters reported that V4-Flash cost roughly three cents on average to complete its benchmark suite, placing it among the least expensive well-known models to run.

DeepSeek nevertheless added a warning to its official pricing page that it planned a significant overall increase in API prices. The new rates had not yet been announced.

The most plausible interpretation is not that the model suddenly became much more expensive to operate. It is that extremely low API prices had completed their most important market task. Cheap tokens reduce the cost of trying a new model and make migration easier. Combined with publicly available V4 weights, the official API helped DeepSeek expand quickly through both direct use and third-party deployment.

Once that ecosystem exists, the official API no longer has to subsidize the entire market indefinitely.

## 6. DeepSeek has already used price as a supply-and-demand tool

The history of V4-Pro reinforces that interpretation. At launch, Pro could cost roughly twelve times as much as Flash. DeepSeek cited constraints in high-end compute capacity and said prices could fall as Huawei Ascend 950 Supernode supply increased later in the year.

In May, DeepSeek made a 75% V4-Pro discount permanent, bringing the price to about one quarter of its initial level.

Its API price has therefore never been a static formula of compute cost plus a fixed margin. Pricing also regulates demand, grows the user base, and improves infrastructure utilization.

Current official concurrency limits are 2,500 for V4-Flash and 500 for V4-Pro. Raising the price of a very cheap, rapidly growing service can increase revenue per unit of compute while pushing highly price-sensitive workloads toward third-party hosting or self-deployment.

Open weights make that possible. Leaving DeepSeek's official API does not mean leaving the DeepSeek model. The company can allow official hosting to recover more profit while the weights continue carrying distribution.

## 7. Why OpenAI can cut Luna's price by 80%

OpenAI is moving from the opposite starting point. GPT-5.6 Luna is not open weight; users cannot download it and ask an arbitrary cloud provider to host it. OpenAI therefore has to make its own entry point attractive enough to achieve scale.

On July 30, OpenAI announced that Luna would cost 80% less. The new API price became $0.20 per million input tokens and $1.20 per million output tokens.

The company can make such a cut because it is optimizing more than the model. OpenAI says routing improvements keep hardware productive, production-software changes generate tokens more efficiently, and context management prevents agents from repeating completed work. It also says GPT-5.6 Sol helped optimize production kernels, contributing to a 20% reduction in end-to-end serving cost, while related experiments improved token-generation efficiency by more than 15%.

The cost advantage comes from jointly optimizing models, kernels, scheduling, caching, context management, and infrastructure.

## 8. OpenAI's real asset is centralized scheduling at scale

OpenAI can also coordinate an enormous request volume across infrastructure it controls. It says its compute strategy matches different workloads to the systems best suited to run them.

Luna and Terra handle high-volume work at the lower-cost end. Sol and the more expensive Fast mode remain available for higher-value tasks. Sol's standard price did not fall with Luna, while Fast mode offers up to 2.5 times the speed for twice the standard price.

This is not a uniform cheapening of all intelligence. It is product segmentation. Routine work moves to Luna, balanced work to Terra, and difficult, latency-sensitive reasoning remains eligible for a premium.

Luna therefore does not need to recover the value of OpenAI's entire model portfolio by itself. **OpenAI increasingly sells a tiered computing product line organized around intelligence, speed, and cost, rather than one model at one price.**

## 9. Free Luna is also a competitive instrument

OpenAI extended the same logic to ChatGPT's free tier on August 6, making Luna the default for Free and Go users and expanding ordinary text chat, while files, images, and other tools retained separate limits.

Luna is therefore more than a low-cost API. It is an acquisition and retention layer for the broader OpenAI ecosystem.

Open-weight models can tell developers that the model can be taken elsewhere, self-hosted, or served by another provider. OpenAI cannot offer Luna on those terms. Its alternative is to make the lack of portability matter less: if the official service is sufficiently cheap and convenient, many users and smaller developers will not buy GPUs, maintain an inference stack, and operate scaling systems merely to save a little on token costs.

The price cut is both a consequence of lower serving costs and a closed-model response to open-weight competition.

## 10. DeepSeek's increase and OpenAI's cut begin from different positions

An open-weight company raising official API prices while a closed-model company cuts them sharply looks contradictory, but it is not.

DeepSeek has already completed the crucial act of distribution. V4 can move into third-party platforms, enterprise servers, and independent inference systems, so DeepSeek does not have to remain the cheapest host forever. Its official API can take on a larger profit-recovery role.

Luna cannot spread independently of OpenAI's infrastructure, so OpenAI has to make the centralized service inexpensive.

They are approaching a similar point from opposite directions. DeepSeek is pulling a deeply subsidized official hosting price toward a normal commercial level. OpenAI is pushing the cost of closed-model calls toward the range associated with open models. The old shorthand—open means cheap, closed means expensive—is becoming less useful.

## 11. Kimi and Qwen put the recovery point in third-party revenue

DeepSeek is recovering value through its own hosting price. Kimi goes further: the weights can still circulate, but a third party building a sufficiently large business around direct access to them may have to share revenue with the developer. Alibaba is reportedly moving in the same direction.

Three different recovery mechanisms are taking shape:

- DeepSeek: keep the model open while restoring commercial margins to the official API.
- Kimi: keep ordinary use accessible while requiring large MaaS operators to negotiate with the research company.
- OpenAI: keep the model closed, control every inference entry point, lower the base tier, and recover value through capability, speed, and tool segmentation.

They are not competing for identical revenue. They are deciding where the charging points should sit along the AI value chain.

## 12. Open weights have entered a second phase

The first phase was about enlarging the pie. Once weights were released, cloud companies, inference providers, application developers, and enterprises could all participate. Foundation-model companies traded some control for faster distribution, broader deployment, and a larger ecosystem.

The second phase is about how to divide what was created. Model laboratories cannot finance increasingly expensive research indefinitely through investment alone. Cloud providers cannot return all revenue upstream. Inference companies need margin to improve infrastructure, and application developers need to retain the value they build above the model.

Open weights are therefore unlikely to mean that everything remains free forever. A more plausible structure keeps research and ordinary use open, preserves internal deployment freedom, leaves room for application-layer value, and asks the businesses earning very large revenue from direct resale of the foundation model to contribute more toward upstream research.

Kimi K3 and the reported Qwen plan explore that division. DeepSeek begins with its own API.

## 13. Competition is no longer only about model performance

Licensing will increasingly become part of model competitiveness. If two models have similar performance but one permits unrestricted commercial hosting while the other requires revenue sharing at scale, providers will eventually include that licensing cost in their prices.

At the same price, an open model offers self-deployment. Yet a closed model with mature tools, efficient infrastructure, and a very low API price may make self-hosting economically unattractive.

Choosing a model is becoming a total-cost calculation that includes performance, inference expense, infrastructure efficiency, commercial licensing, deployment freedom, provider diversity, tools, and the future cost of leaving the platform. “Open,” “free,” or a single per-million-token price can no longer explain the whole decision.

## Conclusion: after expanding the pie, the industry is negotiating how to share it

Open weights initially allowed advanced models to leave a small number of company-controlled servers. Once those models entered more clouds, enterprises, and developer products, a concentrated value chain split into multiple layers. Foundation-model developers, cloud providers, inference companies, and application builders could each earn money from a different part.

Now the people training the models are moving back into that expanded chain. Kimi uses commercial agreements with large MaaS providers; Qwen is reportedly considering a similar mechanism; DeepSeek is ending the expansion role played by exceptionally low API prices; and OpenAI is using full-stack efficiency and scale to push the base cost of closed models down.

None of these structures is inherently the final answer. The central question is no longer only who releases weights. It is who can create rules that preserve broad participation while still funding the next generation of models.

What looks like opposite movement—open providers raising or recovering prices while a closed provider cuts them—reflects the same underlying change:

**Model capability is becoming cheaper. What is being repriced is control, infrastructure, commercial distribution, and each participant's position in the ecosystem.**

*The cover was redrawn with reference to Medcom's [Kimi K3 launch photograph](https://www.medcom.id/teknologi/news-teknologi/4ba1wEBb-ada-model-ai-baru-dari-china-moonshot-kimi-k3-penantang-gpt-dan-claude) and the [Qwen](https://www.marketscreener.com/news/alibaba-to-integrate-qwen-ai-with-taobao-launch-agentic-shopping-source-says-ce7f5bd8da88f423), [DeepSeek](https://finance.yahoo.com/sectors/technology/articles/china39s-deepseek-to-make-permanent-75-price-cut-on-flagship-v4pro-ai-model-133313442.html), and [OpenAI](https://finance.yahoo.com/technology/ai/articles/openai-cuts-prices-smaller-models-170107549.html) news images used in Reuters coverage. The central API and money flows represent value being redistributed among open weights, deployment services, and model pricing; they do not claim specific amounts or market data.*

---

## References

1. [Moonshot AI — Kimi K2.5 License](https://github.com/MoonshotAI/Kimi-K2.5/blob/master/LICENSE)
2. [Moonshot AI — Kimi K3 repository](https://github.com/MoonshotAI/Kimi-K3)
3. [Moonshot AI — Kimi K3 License](https://github.com/MoonshotAI/Kimi-K3/blob/main/LICENSE)
4. [Reuters — Alibaba plans to charge big users of its next open-source AI model, August 7, 2026](https://www.reuters.com/business/retail-consumer/alibaba-plans-charge-big-users-its-next-open-source-ai-model-sources-say-2026-08-07/)
5. [DeepSeek — DeepSeek V4 Preview Release](https://api-docs.deepseek.com/news/news260424/)
6. [DeepSeek — Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
7. [Reuters — DeepSeek's new model is among the cheapest well-known models to run, August 3, 2026](https://www.reuters.com/business/retail-consumer/deepseeks-new-ai-model-is-by-far-cheapest-well-known-models-run-research-firm-says-2026-08-03/)
8. [Reuters — DeepSeek makes a 75% V4-Pro price cut permanent, May 23, 2026](https://www.reuters.com/world/china/chinas-deepseek-make-permanent-75-price-cut-flagship-v4pro-ai-model-2026-05-23/)
9. [OpenAI — Advancing the price-performance frontier with GPT-5.6, July 30, 2026](https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/)
10. [OpenAI — Improving GPT-5.6 Sol and expanding Luna access, August 6, 2026](https://openai.com/index/improving-gpt-5-6-sol-in-chatgpt/)
