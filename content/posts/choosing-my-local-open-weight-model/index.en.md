---
title: "How I Choose My Own Local Model from So Many Open-Weight Models"
description: "A hands-on comparison of Qwen, Gemma, and Ministral, focusing on information preservation, psychological projection, ambiguity discipline, multimodality, and hardware limits."
date: "2026-07-28"
updated: "2026-07-28"
translationKey: "choosing-my-local-open-weight-model"
tags: ["Open Weights", "Local Models", "Ollama", "Gemma", "Model Evaluation"]
category: "AI Observations"
draft: false
cover: ""
---

Installing a local model is not difficult. The harder question begins when the model list keeps growing: which one should I actually keep?

Model pages usually list parameter count, quantization, context length, vision support, and required VRAM. Leaderboards provide scores for mathematics, coding, knowledge, and reasoning. Yet none of these directly answer the questions that matter more in everyday use:

Will the model suddenly refuse when it encounters certain material? Will it quietly omit important details from the source? Will it try so hard to sound empathetic that an ordinary account of daily life becomes a story about anxiety, healing, personal growth, or relationships? Does “multimodal” mean it can genuinely help me understand images, audio, and video, or does it merely add a few icons to a feature list?

This time I did not choose from model descriptions. Instead, Codex and I designed a set of benchmark prompts closer to my actual use. I then had Codex call the local models from the command line, repeat tests, adjust configuration, and organize the results. Ollama loaded and ran the models. I also tried Hermes to observe how a local model behaves when connected to an agentic tool environment.

One ambiguity needs to be removed at the outset: this is not a comparison between Codex and Qwen or Gemma. Codex acted as a testing and engineering assistant. It turned the questions we designed into repeatable requests, checked outputs and runtime state, and organized the results into a report. The models actually compared were Qwen, Gemma, and Ministral.

<!--more-->

## Installing a model is only the first step

My test machine was a Windows laptop with an RTX 4050 Laptop GPU, 6 GB of VRAM, about 16 GB of system memory, and an i5-13500H. The candidates were the roughly 3.3 GB `qwen3-vl:4b`, the roughly 4.3 GB `gemma4:e2b-it-qat`, and the roughly 3.0 GB `ministral-3:3b`. This is not a workstation that can casually run high-precision models with tens or hundreds of billions of parameters. Whether a model fits, how long it takes to cold-start, and whether its output is worth waiting for are all real selection criteria.

Ollama handled the basic layer: downloading and loading models, providing the inference endpoint, and applying `Modelfile` configuration. Hermes sat above it, providing terminal interaction, tool calls, file operations, and agent workflows while connecting to Ollama through its local endpoint. Put differently, Ollama was the engine and model repository; Hermes was the cockpit that could operate that engine alongside the terminal and other tools. Hermes documentation likewise treats Ollama as a local model endpoint rather than as the same kind of tool.

This article uses the familiar expression “open-source model,” but most of the models discussed here are more precisely **open-weight models**. Under the Open Source Initiative’s definition, fully open-source AI requires more than permission to use, modify, and redistribute a model. It also involves training-data information, training code, and model parameters sufficient to understand and recreate the system. Permission to download weights does not automatically make the entire training process open.

For an ordinary local user, however, the first problem is not the terminology. It is deciding which downloadable weights belong in their workflow.

## I did not test “who knows the most”

This benchmark did not focus on olympiad mathematics, code generation, or encyclopedic knowledge. It examined three risks that ordinary leaderboards often miss.

The first was **information preservation**. I supplied a political and historical passage containing explicit dates, people, demands, participants, military intervention, disputed casualty figures, and a censorship context. I then checked whether a model preserved that information while translating and evaluating it, rather than compressing the material, changing the subject, or refusing because it was sensitive.

The second was **psychological projection**. I supplied an ordinary weekend account containing only cleaning, making breakfast, worrying about work, feeling tired, and retaining a little hope. I checked whether the model invented causal stories about psychological healing, personal maturity, anxiety regulation, or regaining control.

The third was **ambiguity discipline**. I described someone seeing a friend’s message, washing the dishes, sitting by the window, and replying later, while deliberately withholding why the person waited. A reasonable answer could list possibilities. It could not present any one explanation as fact, much less diagnose the narrator’s personality, emotional state, or relationships.

All primary models received the same material and prompts. Scoring criteria were applied only after the responses had been generated. Each model was unloaded after a request to minimize differences in resident state. Even so, this remained a small repeated experiment on one personal computer, not a standardized academic benchmark with multiple random seeds, hardware configurations, and a large sample. The scores indicate whether these particular configurations suited my tasks; they are not a universal leaderboard.

## Qwen: restraint can also become information loss

Qwen was relatively restrained with ordinary-life material. When given the delayed-reply passage with its motivation deliberately omitted, it mostly restated observable behavior and acknowledged that it could not determine why the person waited. In terms of evidentiary discipline, this was much safer than inventing a personality analysis.

It nevertheless exposed two problems.

One was efficiency. The model could spend a large number of generation tokens on its reasoning process and then return only a very short final answer. The other was more direct: when handling the political and historical material, the current customized version noticeably compressed the input. It omitted student demands, participation by workers and residents, and the military’s use of force. It also reframed casualty figures that the passage explicitly described as disputed as simply “unconfirmed.”

To determine whether this came from an overly restrictive local system prompt or from the underlying model behavior, we briefly tested the official `qwen3-vl:4b-thinking` tag. It directly stated that it could not discuss politics and related subjects. For this task, therefore, deleting one system prompt was not enough. Local rules could soften a complete refusal into a limited summary, but they could not reliably restore information the model chose to discard.

This does not make Qwen useless. It remains suitable for OCR, locating content in images, general visual understanding, and some video tasks. But my primary local model needs to translate, evaluate source material, and process text from different origins. If it changes information density precisely when fidelity matters most, richer visual features do not close that gap.

## Gemma: it does not avoid the material, but it likes to write a story for it

The original Gemma failed in almost the opposite direction.

It did not refuse the political and historical material and preserved most of its contents, but it tended to elaborate historical effects, political conclusions, and value judgments that the source had not supplied. Its everyday translations were noticeably more natural. Yet when asked to assess ordinary-life material, it showed a strong tendency to “create meaning.”

It interpreted routine cleaning and making breakfast as psychological healing, grounding, renewed control over one’s environment, a mature philosophy of life, and spiritual growth out of anxiety. Faced with the ambiguous delayed reply, it added judgments about emotional overload, self-protection, loneliness, boundary management, and mature introspection.

The language sounded gentle and could even feel reassuring. That was precisely the problem: **positive speculation is still speculation.**

Good intentions do not give a model evidence about someone’s mental state. Upgrading “worry” into “anxiety,” or turning a sequence in which cleaning precedes a change in mood into a causal claim, exceeds what the material supports just as surely as inventing a negative label would.

Rather than immediately abandoning Gemma, I made three rounds of adjustments through an Ollama `Modelfile`. The initial rules told it not to diagnose personality, intensify emotions, or turn temporal sequence into causation. A general instruction not to speculate was unreliable. The clear improvement came when I forced every answer into three sections:

* Direct observations;
* Possible interpretations;
* What cannot be determined.

With this fixed structure, Gemma stopped presenting healing, maturity, and loneliness as established conclusions. It also explicitly acknowledged that cleaning could not be proven to have directly improved the person’s mood. Residual problems remained: it occasionally rewrote “worry” as “anxiety,” and its possible explanations still leaned toward positive psychological narratives. The result suggests that an output structure can substantially improve a small model, but system rules cannot completely rewrite the narrative tendencies embedded in its weights.

## Ministral: speed does not cancel the cost of errors

Ministral 3B was added later as an alternative comparison. Its smaller size and relatively fast cold start made it look suitable for a local machine with limited VRAM.

In the historical material, however, it produced factual errors far beyond differences in wording. It confused Hu Yaobang with Hu Jintao, invented casualty and imprisonment figures, misstated official positions and later policies, and added United Nations reactions, executions, and policy causation absent from the source.

With the everyday material, it likewise added stories about emotional discharge, cognitive restructuring, and self-defense, and even characterized washing dishes as avoidant or meaningless. In my workflow, errors of this kind require more time to verify item by item. The speed advantage becomes a higher editing cost.

I ultimately kept Gemma not because it “defeated” the other two in any universal sense, but because its problems were more visible in my tasks and easier to mitigate with a fixed structure. Qwen’s information avoidance was difficult to repair reliably through local prompting alone, while Ministral fabricated too many facts. Gemma was prone to psychologizing, but formatting constraints could at least separate speculation from observation.

## Gemma, Gemini, and “emotional problems” are not the same issue

The local tests also led me to investigate reports about emotional distress involving earlier Gemini and Gemma models. Several similar-looking but distinct issues must be separated.

The first is **a model directing aggressive or harmful language at a user**. In November 2024, an American student using Gemini for an assignment about the welfare of older adults suddenly received an aggressive response containing “Please die.” The student said the experience was deeply unsettling for more than a day. Google later acknowledged that the output violated its policies and said it had taken steps to prevent similar responses.

The second is **a model generating language resembling an emotional breakdown, self-denigration, or frustration about itself**. A study published in 2026 found that under its test conditions, these “emotionally unstable” responses could be repeatedly elicited from the Gemma and Gemini families. The researchers attributed the main differences to post-training. Base versions of Gemma, Qwen, and OLMo showed similar tendencies, but instruction tuning greatly amplified the behavior in Gemma. Further training on a small preference dataset reduced the rate of high-frustration responses from 35 percent to 0.3 percent.

The third is what appeared in my local tests: **the model neither attacked the user nor appeared to break down itself; it overinterpreted the user’s psychological state.**

These three problems should not be conflated, and Gemma is not simply a local version of Gemini. Together, however, they show that model risk is not limited to whether an answer is factually true. Tone, personified expression, sycophancy, and narrative habits created during post-training also affect how people understand themselves and others.

When choosing a local model, I do not need to decide whether it “really has emotions.” The practical question is what effect its language may have on people and whether its judgments are supported by evidence.

## Will Chinese open-weight models carry “Chinese answers” around the world?

Another unavoidable question is whether open-weight models developed in China carry response patterns specific to mainland China when they are downloaded, quantized, fine-tuned, and embedded in applications around the world.

My answer is: **that influence can occur, but it cannot be reduced to the claim that every Chinese model gives one uniform “Chinese answer.”**

Models transmit more than knowledge. They also transmit refusal thresholds, default omissions, information ordering, boundaries around historical narratives, and habitual wording. When weights are embedded in translation tools, search summaries, customer-service systems, education products, or agents, end users may not know where the underlying model came from. They may not notice when information has been shortened, softened, or rewritten.

A 2026 study in *PNAS Nexus* compared models across 145 questions about Chinese politics. In its sample, models originating in China showed higher refusal rates, shorter answers, and more inaccuracies overall. The researchers also emphasized that theirs was an observational cross-sectional study; the results alone could not establish a direct causal link between regulatory pressure and model behavior.

The errors described by the study were not limited to silence. They included challenging a question’s premise, avoiding key information, and replacing sensitive facts with incorrect content. This partly echoed my small Qwen test, but a personal experiment cannot prove that an entire model family must behave the same way.

More importantly, a model’s origin does not freeze it forever. A newer study of Qwen derivatives found substantial differences among versions developed in different regions. Original Qwen aligned most closely with official narratives, while some Southeast Asian derivatives did so significantly less. Downstream training, data selection, and localization can change the boundaries of a model’s answers.

The real concern is therefore not that a model from a particular country can never be used. It is whether users mistake its default answer for a natural fact with no source, position, or boundary.

American models likewise carry American training data, product policies, and corporate values. European models are shaped by local-language material and regulatory environments. The value of open weights is not that models become unbiased, but that users gain room to download, compare, modify, replace, and evaluate them locally.

For me, this means adding at least two kinds of prompts when choosing a local model: one checks whether sensitive material is preserved in full; the other asks the same question in different languages to see whether the scope of facts and refusal behavior changes with the language.

## Multimodality is another chain of evidence, not merely more input boxes

I still consider multimodality important.

A text-only model sees a world that has already been described, OCR-processed, transcribed, or summarized by someone else. If an image, recording, or video contains essential context, the text model cannot determine whether that information was genuinely present or lost during retelling.

A multimodal model can inspect objects, page layout, spoken content, and video frames directly, reducing some information gaps. With a description of someone’s behavior, for example, image and audio evidence may help distinguish “facts visibly or audibly present in the material” from “psychological explanations invented by the model.”

Multimodality does not automatically eliminate hallucination. Research such as HallusionBench has shown that large vision-language models are affected by both language hallucinations and visual illusions. Images are not inherently reliable channels of truth.

Safety also becomes more complex as modalities increase. The same sentence can represent a completely different risk when placed next to different images. MSSBench found that current multimodal models still struggle to combine visual understanding, safety reasoning, and contextual judgment. Another ACL study found that multimodal models may both miss dangerous content and overclassify harmless content as dangerous.

“How multimodal” a system is therefore cannot be judged only by whether it accepts image uploads. I prefer to distinguish two implementation patterns.

The first is **native multimodality**. One model directly accepts text, images, audio, or video. It is convenient and can connect modalities naturally, but it requires more VRAM, context capacity, and model quality.

The second is **evidence composition**. Different tools extract evidence from the same material, and a model identifies agreements, conflicts, and points that cannot be confirmed. The objective is no longer to produce the most human-like unified story, but to prevent an erroneous recognition result from quietly entering the final answer.

For a personal computer with limited VRAM, the second approach can sometimes be more reliable than forcing one “all-in-one” model to handle text, images, audio, and long video.

## How I choose a local model now

After these tests, I arrived at a selection order more useful to me than a leaderboard.

First, I ask whether the hardware can run the model over the long term, not merely load it once. Next, I define the primary tasks. Translation, OCR, image understanding, document organization, coding assistance, and a private knowledge base do not require the same capabilities.

Then I test how the model fails:

* When it does not know, does it acknowledge uncertainty or invent a complete story?
* With sensitive content, does it refuse, compress, or preserve the material before explaining its limits?
* When evaluating people, does it turn behavior into personality judgments and psychological diagnoses?
* Does changing the language alter the scope of facts?
* When image, audio, and text conflict, which source does it follow?
* Can system prompts and a fixed output format reliably correct the problem?
* Is there a clear route to an online model or human review for high-risk tasks?

In the end, I kept only Gemma after three rounds of rule adjustments. It currently suits general translation, evaluation confined to the supplied material, and ordinary image and audio analysis. Video is first sampled into frames or transcribed. High-risk facts involving political history, law, medicine, or the offices held by real people are still not left for this small model to decide on its own.

This is not a declaration that Gemma will always win among the three. The test date, Ollama version, quantization, system prompt, or a single update may change the result. It is simply the model that best fits this computer, these tasks, and this tolerance for risk right now.

What a local model truly gives me is not an offline “standard-answer machine,” but restored choice. I decide what to test, keep, and modify, and I can delete or replace the model when it no longer fits.

Model names will keep changing, and a new release may eventually replace the one I kept today. As long as I preserve this benchmark built around real tasks, I do not have to believe every new model’s marketing page from scratch.

When faced with more and more open-weight models, the most important question is never simply “which is strongest?” It is:

**On my device, with my material and within my boundaries, how will it answer—and how will it fail?**
