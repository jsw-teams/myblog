---
title: "From Global Governance Back to the Individual: Whether Models Are Open Ultimately Determines Whether Users Can Leave"
description: "Starting from competing approaches to frontier-model protection, open cooperation, and multi-model platforms, this article examines how users and developers can preserve the ability to migrate data, replace models, and leave a platform."
date: "2026-07-17"
updated: "2026-07-18"
translationKey: "open-models-and-the-right-to-leave"
tags: ["AI Governance", "Open Models", "Closed Models", "Platform Lock-in", "Portability"]
category: "AI Commentary"
draft: false
cover: "https://pictor.js.gripe/i/2296a6c8-5d9f-41af-63d2-b902aa8e7800/public.jpg"
---

Demis Hassabis has proposed creating a frontier AI standards body that would test models above a defined capability threshold before release and, when necessary, prevent high-risk models from entering the market. The proposal focuses on the most serious class of risk: preventing a model release that has not been adequately evaluated from causing irreversible harm to society. ([The Verge][1])

When Microsoft CEO Satya Nadella shared the article, he described the goal as building a frontier ecosystem that advances both “innovation and choice” while preventing a single model drop from “breaking the world.” Here, “model drop” means the release of a new model rather than a service outage. Sam Altman called it a thoughtful proposal. Their responses suggest that leading model companies are increasingly receptive to stricter frontier evaluations, but they do not establish that those companies agree on the proposed body’s powers, funding, or control over market access. ([X][2])

Nor should Nadella’s “choice” be understood merely as putting more models inside one cloud platform. For individual consumers and developers, real choice includes another capability: when a model raises prices, changes its rules, is retired, or is no longer trustworthy, can users take their data and workflows somewhere else?

<!--more-->

## Two Governance Approaches Ultimately Converge on the Same User

Hassabis’s proposal represents a frontier-protection approach. The closer a model’s capabilities come to high-risk areas such as cyberattacks, biological design, and autonomous action, the stronger the case for testing it in a controlled environment. Some benchmarks and attack methods cannot be fully disclosed, and release decisions cannot be left entirely to developers themselves.

The open-cooperation approach represented by WAIC puts a different risk first. If high-performance models, compute, and infrastructure remain concentrated among a small number of US companies, other countries, developers, and ordinary users will be limited to buying access instead of participating meaningfully in model development and localization. The 2025 *Global AI Governance Action Plan* released at WAIC called for cross-border open-source communities and the sharing of platforms, technical documentation, and non-sensitive resources. Discussions at WAIC in 2026 have continued to emphasize open-source models and capacity building in the Global South. ([Ministry of Foreign Affairs][3])

The two approaches are designed to prevent two different failures:

One side fears that dangerous capabilities cannot be recalled once released; the other fears that AI capabilities will remain permanently sealed inside a handful of platforms.

For individuals, this is not an abstract dispute between national strategies. A model’s degree of openness ultimately determines whether alternatives remain if it disappears, whether users can migrate when platform rules change, and whether the knowledge they previously gave a model must remain trapped in the original account.

## Openness and Closure Are Not Synonyms for Maintenance Burden and Convenience

Discussions of open models often fall into the same false contrast: users of open models supposedly have to buy GPUs, configure an environment, and shoulder all maintenance, while closed models are portrayed as inherently stable, convenient, and suitable for ordinary people.

Reality is more complicated.

Multiple Qwen3 variants were released with open weights. Users can deploy them on servers through tools such as vLLM or run them on personal devices with Ollama, LM Studio, and llama.cpp. Open weights make self-deployment possible; they do not require every user to deploy locally. ([Qwen][4])

Open models can also be hosted by cloud platforms. The Microsoft Foundry model catalog includes models from OpenAI, Anthropic, Meta, DeepSeek, Hugging Face, and other providers. Users may bring their own models or use versions managed by the platform. In the latter case, the cloud provider still handles compute, scaling, and basic operations. ([Microsoft Learn][5])

Whether a model is open and whether a service is hosted are therefore separate questions:

An open model can be maintained by its user or by a platform; a closed model can be offered by its developer or accessed through several cloud providers.

The real difference appears when the hosted service ends: can the user still obtain the model and continue running it another way?

## Open Models Offer More Exit Routes, but Those Routes Require Preparation

For individual users, the most direct value of an open model is preserving a way to run it outside a platform.

Users can process confidential material locally, retain a verified model version, or fall back to a less capable but continuously available local model for basic tasks when a commercial service is unavailable. The point is not necessarily to pursue the strongest performance. It is to prevent all work from stopping when one account fails.

Open weights, however, do not automatically create independence.

A user who always accesses an open model through the same cloud platform, without saving data, prompts, or model versions, can still become dependent on that platform. If a developer relies on proprietary file storage, agent systems, and vector databases, downloading the underlying model may not make the application easy to move.

Open weights are not necessarily the same as fully open source. A model may publish its parameters without disclosing its training data, data-processing pipeline, or complete training code. Users can run it without fully understanding how it was created, and weights alone cannot resolve every question about data and safety.

Open models therefore provide more exit routes, not a migration plan that has already been completed.

## Closed Models Carry More Service Responsibility, but Users Still Do Not Own Them

The advantages of closed platforms are real as well.

Individual users can access file analysis, web search, voice, memory, and cross-device synchronization without understanding inference frameworks or hardware requirements. Developers can leave model training, inference clusters, capacity management, and security updates to the provider.

Closed models are not always tied to a single cloud. Some Anthropic models are available through Anthropic’s own API as well as Amazon Bedrock, Google Cloud, and Microsoft Foundry. That can reduce an organization’s dependence on any one cloud infrastructure provider. ([Claude Platform Docs][6])

Multi-cloud availability does not, however, change model ownership.

Anthropic defines active, deprecated, and retired stages for its models. Once a model is retired, applications that depend on it must migrate or their requests will stop working. Retirement dates on partner platforms may also differ from those of Anthropic’s own API. ([Claude Platform Docs][7])

Developers may therefore be able to change cloud providers without being able to preserve the model. As long as the weights remain closed, the model company retains control over version changes, service termination, and final retirement.

Data export in consumer products solves only part of the problem. ChatGPT lets users export their chat history and account data, allowing them to preserve their written records. ([OpenAI Help Center][8]) But an exported conversation cannot reproduce the original model’s behavior, memory system, file tools, and product environment on another platform.

What users delegate to a closed service is therefore not only maintenance, but also continuity of access.

## A Large Model Catalog Does Not Mean Freedom from the Platform

Nadella’s emphasis on “innovation and choice” aligns with Microsoft’s strategy of developing a multi-model platform. Letting developers compare closed models, open models, and services from different vendors within one cloud is genuinely more flexible than restricting them to a single model.

But two different layers of concentration remain.

The first is model concentration: an application can use only the models of one laboratory.

The second is platform concentration: an application can choose among many models, but its identity, data, logs, deployment, and billing all remain inside one cloud ecosystem.

Moving from the first kind of concentration to the second can reduce the disruption caused by one model’s retirement, but it does not eliminate platform lock-in.

Real portability cannot be measured by the size of a model catalog alone. It depends on four things:

Whether the model weights or an alternative model can be obtained;

whether user data and business records can be exported;

whether prompts, tools, and evaluation methods can be reused elsewhere;

and whether an application can change suppliers without rebuilding all of its infrastructure.

A platform can offer a thousand models, but if users cannot take their data and business logic with them, choice still exists only inside that platform.

## The Reverse Information Paradox: The Better a Model Knows You, the More You Must Re-explain When You Leave

Under the “reverse information paradox,” users must continuously provide background material, writing preferences, project rules, and standards of judgment to get better model output.

The more a model knows about a user, the smoother the service often feels. But the more information accumulates inside a platform, the more the user must reorganize and explain when moving to another model.

Individuals may gradually leave article drafts, research, long-term plans, and important judgments in chat histories. Developers may encode system prompts, tool definitions, and business decisions in forms tailored to a specific model.

At that point, model dependence is no longer merely technical. It becomes information dependence. The platform supplies computing power while gradually becoming the gateway through which users organize personal knowledge and understand the world.

“Do not rely on one model” does not mean asking three platforms every question. It is entirely reasonable to use one convenient model for routine editing, summaries, and low-risk creative work.

A second path matters most for tasks with serious consequences: medical, legal, and financial matters; public events and historical disputes; employment decisions; and critical technical configurations. In those cases, users should at least return to the original material or compare another model and sources from a different region.

The same model should not be allowed to supply the facts, interpret the controversy, answer every objection, and then prove that its original answer was correct.

## Exit Capability Can Be Implemented in Concrete Ways

Individuals do not need to build complex local-model clusters, but important information should not exist only inside a chat platform.

Long-term project context, writing rules, and frequently used prompts can be stored as plain text or Markdown. Important conclusions should be saved alongside their original sources, and sensitive data should be limited to the minimum needed for the task. Users can also maintain a different platform or a local open model as a backup entry point.

Developers likewise do not need to integrate every model at once. They need to make replaceability part of the architecture.

User files and business data should remain in storage the developer controls. System prompts, tool definitions, and test cases should be versioned. Differences between provider APIs should be isolated in adapter layers. Every model upgrade or switch should be retested against the application’s own evaluation set rather than judged solely by public leaderboards.

An open model does not need to carry the entire production workload. It can serve only privacy-sensitive tasks, local testing, or continuity during an outage. A closed model can remain the primary service as long as the application has not locked all its data and workflows inside the supplier.

## Real Choice Means Retaining the Ability to Leave

Hassabis worries that one dangerous model release could cause irreversible harm to the world. Nadella emphasizes a frontier ecosystem that supports innovation and choice. The WAIC approach adds that AI capabilities should not remain under the long-term control of a small number of countries and closed platforms.

These positions are not necessarily incompatible.

Frontier models can undergo strict pre-release testing. Non-sensitive safety tools, evaluation methods, and foundation models should remain open. Individuals need data export and migration capabilities. Developers need multi-provider and self-hosting paths. Regulators must not use safety as a reason to expand technical review without limit into market exclusion and identity-based restrictions.

A healthy AI ecosystem does not require everyone to reject closed models, nor does it require every model to publish its weights immediately.

It should let users enjoy the convenience of hosted services without losing the right to take their data. It should let developers rely on the best-performing commercial models while retaining the technical conditions needed to replace them. It should let governments restrict genuinely dangerous capabilities while requiring the grounds, duration, and review process for those restrictions to remain transparent.

The most important distinction between open and closed systems ultimately lies not in slogans, but in how much choice remains after a model or platform changes.

Real choice is not the number of models a user can click on a page. It is whether individuals and developers can still take their data and continue their work elsewhere when one of those models changes, shuts down, or can no longer be trusted.

[1]: https://www.theverge.com/tech/965270/google-deepmind-demis-hassabis-global-ai-watchdog?utm_source=chatgpt.com "Google's Demis Hassabis says it's time for a global AI watchdog - led by the US"
[2]: https://x.com/satyanadella/status/2077063479232795024?utm_source=chatgpt.com "An important piece from Demis. We need more of this kind ..."
[3]: https://www.fmprc.gov.cn/mfa_eng/xw/zyxw/202507/t20250729_11679232.html?utm_source=chatgpt.com "Global AI Governance Action Plan_Ministry of Foreign ..."
[4]: https://qwenlm.github.io/blog/qwen3/?utm_source=chatgpt.com "Qwen3: Think Deeper, Act Faster"
[5]: https://learn.microsoft.com/en-us/azure/foundry/concepts/foundry-models-overview?utm_source=chatgpt.com "Microsoft Foundry Models overview"
[6]: https://docs.anthropic.com/en/release-notes/api?utm_source=chatgpt.com "Claude Platform release notes"
[7]: https://docs.anthropic.com/en/docs/about-claude/model-deprecations?utm_source=chatgpt.com "Model deprecations - Claude Platform Docs"
[8]: https://help.openai.com/en/articles/7260999-exporting-your-chatgpt-history-and-data?utm_source=chatgpt.com "Exporting your ChatGPT history and data"
