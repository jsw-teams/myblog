---
title: "How Did AI Go from Remembering a Passage to Remembering You?"
description: "A history of how AI products moved from context windows and long-text attention to summaries, retrieval, and cross-session memory—and the new problems created by stale information and memory opacity."
date: "2026-07-24"
updated: "2026-07-24"
translationKey: "how-ai-learned-to-remember-you"
tags: ["AI Memory", "Context Windows", "Cross-session Memory", "RAG", "Artificial Intelligence"]
category: "AI Observations"
draft: false
cover: "https://pictor.js.gripe/i/b09ea333-ca0a-4173-2ee8-90f3f7c6d400/public.png"
---

When people first use a chat AI, it is easy to assume that as long as a conversation remains in the sidebar, the model should remember everything that happened. We can scroll upward and read what was said hours ago. But the model is not sitting behind the chat window, continually rereading the entire record. Before it answers, the product assembles the current instruction, recent messages, file contents, tool results, and other relevant material, then sends that package into the range the model can process. This temporary range is what we call the context.

Think of context as a workbench. The user's latest messages, uploaded files, and current task are laid out on the surface, and the model generates its next answer from what is on the table. A larger context window means a larger table that can hold more conversation, documents, and code at once. Google used a similar explanation for Gemini 1.5: the context window is the amount of information a model can receive and process in one pass, represented as tokens for text, images, audio, or code.

The table was not always so large. The 2017 Transformer paper introduced attention-based handling of relationships across a sequence and laid the foundation for later large language models. In 2020, GPT-3 still had a 2,048-token context window, but the research demonstrated an important capability: when task instructions and a few examples were placed in the context, the model could temporarily learn how to perform the task without retraining its parameters.

<!--more-->

That suggested an obvious product strategy. If models adapt their answers to the material in front of them, letting them see more material at once might make them more capable. Context windows expanded rapidly. In May 2023 Anthropic increased Claude's context from 9K to 100K tokens and emphasized its ability to read hundreds of pages at once. In November, OpenAI released GPT-4 Turbo with 128K context, while Anthropic raised Claude 2.1 to 200K. In February 2024, Gemini 1.5 Pro began testing context windows of up to one million tokens.

The progression from 2,048 to 100,000, 200,000, and then one million resembles a larger hard drive: the more it holds, the less it should forget. But context is not storage, and a model does not perform exact full-text search over it. Material fitting inside the window does not mean every passage receives equal attention. Soon after introducing 100K context, Anthropic published long-context prompting advice that recommended extracting relevant quotations before answering—evidence of the gap between “the material is present” and “the model can reliably find and use it.”

The *Lost in the Middle* research found that models often use important information more reliably when it appears near the beginning or end of a long text; performance can decline when the same information is moved into the middle. Microsoft's later work on multi-turn conversations found that tested models performed about 39% worse on average in multi-turn settings than on single-turn tasks. Models often make assumptions early and continue along the same path. Once the initial interpretation is wrong, later corrections may not fully recover the task.

This explains a familiar experience: an AI remembers the project's original goal and hears the newest request, yet misses the most important change made halfway through. It says it understands the new approach, then brings the old structure back in its next response. The record did not disappear; the old interpretation developed momentum, and the new requirement did not completely replace it.

Even a very large workbench eventually fills up, so products need other methods. One is to compress older conversation into a shorter summary. Another is retrieval: find a few relevant passages in an external collection and insert them into the current context only when needed. The 2020 RAG research combined language models with retrievable knowledge stores to update knowledge and provide clearer sources. In 2023, OpenAI added persistent threads and Retrieval to the Assistants API so developers did not have to assemble the complete history manually. Its documentation still noted that sufficiently long threads must be truncated to fit the context window.

AI products therefore moved from “put more into the model at once” to “select what may be useful now.” Claude introduced Projects in 2024 to organize conversations and project material in one space. Such knowledge bases do not mean the model permanently remembers the entire project. They make it easier for the product to organize a stable collection of material before each response.

Cross-session memory entered consumer chat products along the same path. OpenAI began testing ChatGPT memory in February 2024, initially emphasizing preferences and personal details that users explicitly asked it to remember. In April 2025, ChatGPT memory expanded to draw from both saved memories and past chats. Google announced in February 2025 that Gemini could refer to relevant earlier conversations and continue previous discussions in a new chat.

This changed what “new chat” meant. Previously, starting one usually meant receiving an empty workbench. With cross-session memory, the new table may already contain notes selected from the past: a preferred writing style, a long-term goal, or the last-known state of a project.

That is genuinely convenient. Users no longer need to repeat their language preferences or project background, nor search dozens of chats for an old decision. It also creates new questions: what deserves to be saved, what should be retrieved, and whether the old information is still valid.

Ordinary preferences are relatively easy. A preference for concise answers or an aversion to a particular food may not change every day. Project state is different. A plan used last week may have failed today. An article that began as a technical piece may have shifted to a personal perspective. A user may edit files, talk with collaborators, or abandon a plan without opening the AI.

If the AI did not see those changes, it cannot know them. It holds the last state it was told about, not the real project itself. Without a visible time boundary, a system may turn “this was true during our last conversation” into “this is true now.”

This concern is not merely outside speculation. OpenAI's current memory documentation says older saved-memory systems may become stale or retain conflicting facts—for example, one note saying a user is training for a marathon and another saying the user injured a foot. Newer systems therefore try to update and organize memories automatically and display some sources, although the documentation also notes that the source interface may not show every factor affecting an answer.

Context compression can create a similar problem. In 2025, a VS Code user reported that after Copilot Agent displayed “Summarized conversation history” during a long debugging session, it lost an important clue and entered a loop. In 2026, a Codex user reported that after automatic compaction, the assistant initially understood the current task but then returned to an already completed deployment task and executed an unrelated `git push`. These public reports do not establish that every compression mechanism behaves this way. They illustrate a direct risk: a summary can change what the system treats as the current task rather than merely making it remember less.

Users discussing cross-session memory have raised a different concern. In a Claude community discussion about storing project decisions in an external knowledge base, participants worried less about failing to find a record than about retrieving one that had once been correct but had since expired. Some added last-verified dates, expiration dates, and statuses such as active, stale, or retired. Projects end and files drift away from reality; users may discover that only when the AI confidently repeats obsolete information.

Separate anecdotes should not be merged into a single story that the evidence does not support. Public examples separately show that conversation compression can cause task drift and that cross-session stores can retrieve stale records. Proving that a particular product first saved an incorrect summary and then retrieved it as long-term memory in a later chat would require internal evidence.

Operationally, however, the two mechanisms meet at response time. Wherever cross-session memory is stored, it must re-enter the current context before the model can use it. Memory is not a second brain operating independently of context. It is more like a product selecting a few notes from an old archive and placing them on the new workbench. If a note is stale, it influences the answer as part of the “new” context.

![Jie discusses her increasingly blurred memory in *Arknights* TA-7](https://pictor.js.gripe/i/b09ea333-ca0a-4173-2ee8-90f3f7c6d400/public.png)

The treatment of Jie and history in *Arknights* TA-7 offers a compact analogy: when the same system repeatedly organizes and writes history, the recorded version gradually appears more stable and authoritative while change itself fades from view. AI can behave similarly. When a system repeatedly extracts, compresses, and recalls old material, one version can become fixed and continue shaping judgments about the present.

This is why cross-session memory needs more transparency than an ordinary chat log. Users can at least scroll through a conversation. With extracted memory, they may not know which conversation it came from, when it was recorded, why it was selected, or whether newer facts have invalidated it. When a model accurately recalls a few personal details, users may also overestimate how well it understands the entire project.

None of this means less long-term memory is always better. Without cross-session continuity, users must repeatedly explain their background. Very long context introduces cost, compression, and attention-allocation problems. Depending entirely on external files hands the work of maintaining project records back to the user. Current product development appears to be searching for a balance among these approaches rather than presenting a perfect answer.

For individuals, a realistic expectation is not that AI will always know the latest project state, but that it will not present the unknown as known. It should be able to say, “The last state I saw was this, but that record is a week old.” When old memory conflicts with a current instruction, it should surface the conflict instead of silently choosing one version. Slowly changing preferences such as writing style can carry forward naturally; current files, project progress, and technical direction need clearer dates and sources.

In hindsight, the product path is easy to understand. We wanted AI to see more than a few sentences, so context grew. Context could not contain all history, so products added summaries and retrieval. Reexplaining everything in each new chat was tedious, so cross-session memory followed. Every step made AI feel more familiar with the user while replacing an old problem with a more complex one: it must not only find the past, but also know whether the past has passed.

What AI truly needs to learn may not be unlimited remembrance, but the ability to admit at the right moment: “I do remember this, but I am not sure it is still true.”
