---
title: "開放權重之後，模型公司開始重新分蛋糕"
description: "從Kimi K3的大型MaaS協議、Qwen可能採用的收益分享、DeepSeek API漲價預告與GPT-5.6 Luna降價，觀察模型能力擴散後價值如何在研發、託管與應用層之間重新分配。"
date: "2026-08-07"
updated: "2026-08-07"
translationKey: "open-weights-redistributing-ai-value"
tags: ["開放權重", "Kimi K3", "Qwen", "DeepSeek", "OpenAI", "MaaS", "AI商業模式"]
category: "AI觀察"
draft: false
cover: "https://pictor.js.gripe/i/ea34ce2b-6414-44c8-a4ea-7890720c9100/public.png"
---

過去幾年，開放權重最有吸引力的一點，並不只是模型可以下載。

真正發生變化的是，一部分原本集中在基礎模型公司的價值創造能力被分散了出去。

模型權重下發以後，雲端運算公司可以提供託管，推理服務供應商可以通過量化、快取、批次處理和 kernel 優化降低成本，企業可以建立私有部署，開發者可以繼續微調並建構自己的應用。基礎模型由一家公司的產品，逐漸變成更多公司可以繼續加工的生產資料。

這也是此前討論開放權重時，我更在意的“把蛋糕分給更多人”。

但到了 2026 年，這件事出現了新的後半段。

Kimi K3 開始要求達到一定規模的 MaaS 服務供應商重新簽訂商業協議，實際合作中已經出現收入分成；阿里據報也準備在下一代 Qwen 中採取類似方式。DeepSeek 則在維持開放權重的同時，明確預告官方 API 將大幅漲價。

另一邊，OpenAI 卻在把 GPT-5.6 Luna 的 API 價格一次下調 80%，隨後又把 Luna 下放為 ChatGPT 免費使用者的預設模型。

這些動作放在一起看，真正發生的並不是簡單的價格戰。

**開放權重公司在模型完成大規模擴散以後，開始尋找把收入重新送回研發端的方法；OpenAI則利用封閉模型的全端控制和巨大呼叫規模，把基礎智慧主動做成越來越便宜的入口。**

AI 模型競爭由此從“誰願意把模型放出來”，進入了“模型產生的價值到底由誰來分”的階段。

<!--more-->

## 一、開放權重先把蛋糕做大

Kimi K2.5 很能代表開放權重早期的邏輯。

它採用 Modified MIT License，基本保留了使用、複製、修改、發佈、分發、再許可和銷售模型及衍生作品的自由。真正針對超大商業產品增加的條件，主要是品牌展示。

授權條款寫道：

> “you shall prominently display ‘Kimi K2.5’ on the user interface of such product or service.”

中文可以譯為：

> “你應當在該產品或服務的使用者界面上顯著展示‘Kimi K2.5’。”

這個要求只在產品超過 1 億月活，或者月收入超過 2000 萬美元時觸發。

這裡並不存在“你用了我的模型賺錢，就必須按照收入向我交一部分”的關係。

這實際上給了下游很大的商業空間。

一家推理平台可以取得模型以後建設自己的 GPU 集群，再靠更好的調度和推理優化賺錢；企業可以自己部署，避免把敏感數據發送到公共 API；應用公司可以把模型能力包裝成更具體的軟體產品。

模型研發公司得到的是影響力和生態，其他參與者則分別從算力、部署、優化和應用中取得收益。

開放權重由此產生了一種與封閉 API 不同的產業結構：

**模型公司創造基礎能力，但不再自動取得這項能力以後產生的全部收入。**

這也是“把蛋糕分出去”真正發生的地方。

對於個人和企業使用者而言，得到的也不只是便宜。

同一個模型可以由多個服務供應商提供，也可以部署在自己的基礎設施。如果一個 API 服務供應商漲價或者停止服務，更換服務供應商並不意味著必須連底層模型一起更換。

開放權重分散的不只是收入，還包括部署權、優化權和退出權。

## 二、Kimi K3開始修改分錢規則

到了 Kimi K3，Moonshot 沒有把已經分出去的權重重新收回來。

K3 仍然是一款開放權重模型，Moonshot 官方倉庫將其描述為一款 2.8T 參數、104B 激活參數的開放權重多模態 Agent 模型。

真正發生變化的是授權條款。

K3 對 Model as a Service，也就是 MaaS，增加了專門規定。按照授權條款定義，這主要指向第三方提供模型推理或者微調能力，並讓客戶能夠實際控制輸入、參數或者訓練數據的服務。普通終端產品只是把模型嵌入某項具體功能，並不會因此自動成為 MaaS。

當一家經營 MaaS 的企業及其關聯公司在連續 12 個月內總收入超過 2000 萬美元以後，授權條款規定：

> “the Licensee must enter into a separate agreement with Moonshot AI”

中文即：

> “被許可方必須與 Moonshot AI 另行簽訂協議。”

這份協議需要在繼續將 K3 或其衍生作品用於商業用途之前完成。

內部使用則被明確排除在這一要求之外。

這個邊界很重要。

一家企業把 K3 部署在內部做知識檢索，與一家雲平台直接出售 K3 推理 API，是兩種不同的商業行為。

Moonshot現在真正想收費的，是後者。

換句話說，K3 沒有取消其他參與者分蛋糕的資格，而是開始要求那些**直接把基礎模型本身變成大規模生意的人重新和模型研發者分錢。**

## 三、“最高30%”意味著研發方開始重新進入價值鏈

K3 公共授權條款沒有寫死統一的收入分成比例，它只規定達到條件的大型 MaaS 需要另外簽署協議。

真正的分成數字來自已經開始形成的商業合作。

Reuters 8 月 7 日援引消息人士報道稱，Moonshot 在部分合作中要求：

> “up to a 30% revenue share”

即：

> “收入分成最高可達到 30%。”

這是部分商業協議的條件，不是所有 K3 使用者統一面對的授權費。

中軟國際已經披露與 Moonshot 存在收入分成協議，但沒有公佈具體百分比。

DigitalOcean CEO Paddy Srinivasan 也確認公司與 Moonshot 存在商業協議。

這一步的意義其實比“30% 高不高”更大。

開放權重原來解決的是模型能力如何從一家公司的伺服器中走出去。

現在開始解決的是，**能力走出去以後，訓練模型的人還能從哪裡獲得下一代模型的研發資金。**

如果一個實驗室承擔模型訓練、數據處理、後訓練和研究人員成本，模型發佈以後卻由另一家公司建立 GPU 集群、包裝成 API，再形成數千萬美元甚至更大的業務，基礎研發與下游商業收入之間會逐漸脫節。

K3 給出的答案不是重新封閉模型，而是在大型模型轉售層增加一個價值迴流口。

這實際上補上了開放權重商業模式過去最薄弱的一環。

## 四、Qwen跟進後，這已經不是一家公司的試驗

如果這種模式只出現在 Kimi，仍然可以理解成 Moonshot 自己的一次授權條款實驗。

但阿里已經準備往相同方向走。

Reuters 報道稱，阿里計劃要求下一代 Qwen 開放模型的主要商業使用者，分享利用模型產生的一部分收入。

此前阿里主要在模型運行於阿里雲時收費，而客戶把多數開放模型部署到自己的數據中心以後，不需要繼續向阿里支付模型使用費用。

新的制度如果按報道落地，就意味著收費邊界會從“誰替你運行模型”進一步延伸到“誰提供了這個模型本身”。

這也說明中國開放權重模型正在進入一個很明顯的商業階段：

早期先把模型免費或者極低成本送進市場；

形成開發者、雲端供應商和企業部署生態；

隨後再針對重度商業使用、提前訪問、深度合作和大型 MaaS 收費。

Reuters 在報道中將這種模式概括為一種已經在硅谷反覆使用的 freemium 路線。

開放權重因此開始從單純的發佈策略，變成一種真正需要設計收益分配的產業結構。

## 五、DeepSeek漲價，更像是低價擴張期結束

DeepSeek走的是另一條路線。

截至 8 月 7 日，V4-Flash 的官方 API 價格仍然只有每百萬輸入 token 0.14 美元、輸出 token 0.28 美元；V4-Pro 分別是 0.435 美元和 0.87 美元。

這個價格低到什麼程度，Artificial Analysis 的測試給出了一個比較直觀的參照。

Reuters 報道稱，V4-Flash 完成其基準測試的平均模型費用約為 0.03 美元，是當時知名模型中運行費用最低的一檔。

DeepSeek隨後卻在官方價格頁寫道：

> “We plan to raise the overall pricing for DeepSeek API services in the near future, with a significant increase expected.”

中文即：

> “我們計劃近期整體提高 DeepSeek API 服務價格，預計漲幅較大。”

截至目前，新價格還沒有正式公佈。

從 DeepSeek過去的定價變化看，這次漲價最合理的解釋並不是模型突然變得更昂貴，而是**極低 API 價格已經完成了它最重要的市場任務。**

低價最初不僅是在出售 token，也是在購買市場份額。

當 API 足夠便宜，開發者嘗試一個新模型的成本就會大幅降低；應用從其他模型遷移過來的阻力也會下降。再加上 V4 本身已經公開權重，DeepSeek能夠同時依靠官方超低價 API 和第三方部署迅速擴大生態。

V4-Flash 正是這條路線的典型產品。DeepSeek在 V4 發佈時直接將其定位為快速、高效、經濟的版本，同時公開了 V4 權重。

現在生態已經形成，官方 API 就不必永久承擔補貼整個市場的任務。

## 六、DeepSeek過去已經把價格當作供需調節工具

V4-Pro 今年的價格變化進一步說明這一點。

V4剛發佈時，Pro 的價格最高可以達到 Flash 的約 12 倍。DeepSeek當時給出的原因是：

> “constraints in high-end compute capacity”

即：

> “高端算力容量受限。”

DeepSeek還表示，隨著華為 Ascend 950 Supernode 在下半年大量供應，Pro 價格預計會明顯下降。

到了 5 月，DeepSeek果然把 V4-Pro 原本的 75% 折扣永久化，使價格降到最初水平的大約四分之一。

這說明 DeepSeek 的 API 價格本來就不是靜態的“計算成本加固定利潤”。

它同時承擔著調節算力需求、擴大使用者規模和提高設備利用效率的作用。

今天 V4-Flash 的官方併發限制是 2500，V4-Pro 是 500。

一個價格極低、呼叫規模迅速擴張的模型，提高價格自然能夠同時完成兩件事情：

一方面提高每單位算力帶來的收入；

另一方面把極度價格敏感的大規模呼叫推向第三方託管或者自行部署。

而開放權重恰好給了 DeepSeek 這麼做的空間。

使用者離開 DeepSeek 官方 API，並不等於離開 DeepSeek 模型。

因此，**DeepSeek現在可以開始讓官方託管服務恢復利潤，而繼續讓開放權重承擔模型擴散。**

這就是它與完全封閉模型最大的不同。

## 七、OpenAI為什麼反而可以把Luna降價80%

OpenAI現在走向了相反方向。

GPT-5.6 Luna 沒有開放權重。使用者無法把 Luna 下載下來，然後交給任意雲端供應商託管。

因此，OpenAI想讓 Luna 獲得足夠大的使用規模，就必須讓官方入口本身具有足夠強的吸引力。

7 月 30 日，OpenAI直接宣佈：

> “Starting today, GPT-5.6 Luna, our fastest and most affordable model, will cost 80% less.”

中文可以譯為：

> “從今天開始，GPT-5.6 Luna——我們速度最快、價格最低的模型——價格將降低 80%。”

降價以後，Luna 的 API 價格變成每百萬輸入 token 0.20 美元、輸出 token 1.20 美元。

OpenAI之所以有能力做這樣的價格調整，首先因為它已經不再只是優化模型本身。

它正在優化從模型到最終 token 輸出的整條技術棧。

官方披露，更好的路由提高硬件利用率，生產軟體優化提高 token 生成效率，上下文管理則減少 Agent 重複已經完成的工作。

GPT-5.6 Sol 甚至被用於優化 OpenAI 自己的生產 kernel，這些工作幫助端到端 serving 成本降低約 20%，相關實驗又使 token 生成效率提高超過 15%。

這意味著 OpenAI 的成本優勢已經不僅來自“訓練一個更小的模型”。

它來自模型、kernel、調度、快取、上下文管理和基礎設施一起優化。

## 八、OpenAI真正擁有的是規模化集中調度能力

OpenAI還能做一件開放權重實驗室很難單獨做到的事：把巨大呼叫量統一放進自己的基礎設施中調度。

OpenAI明確表示，其計算策略會針對不同 workload 匹配最適合運行它們的系統。

低成本端由 Luna 和 Terra 承擔大規模日常工作；高價值端則繼續由 Sol 和更昂貴的 Fast mode 提供服務。

Sol 的普通價格並沒有隨著 Luna 一起下降，而 Fast mode 甚至按照 Standard 兩倍價格提供最高約 2.5 倍速度。

這說明 OpenAI並沒有簡單地把所有智慧一起廉價化。

它是在做價格分層。

大量普通任務進入 Luna；

需要更高能力的工作進入 Terra；

高價值複雜推理繼續由 Sol 收取溢價；

對延遲特別敏感的客戶還能繼續購買更昂貴的 Fast mode。

因此，Luna沒有必要獨自承擔 OpenAI 整個模型體系的價值回收。

**OpenAI賣的已經不再只是一個模型，而是一整條按照智慧、速度和成本分層的計算產品線。**

這給了它更大的降價空間。

## 九、免費的Luna也是一種商業武器

OpenAI 隨後又把這種低價路線推進到了 ChatGPT 免費層。

8 月 6 日官方宣佈：

> “For Free users, we're updating the default model to GPT-5.6 Luna and expanding access with unlimited text chats.”

中文可以譯為：

> “對於 Free 使用者，我們正在把預設模型更新為 GPT-5.6 Luna，並開放不限次數的文本聊天。”

Luna 會成為 Free 和 Go 使用者的預設模型，普通文本聊天進一步放寬，但文件、圖片和其他工具仍然存在獨立限制。

這意味著 Luna 已經不只是一個廉價 API。

它還是 OpenAI 獲得使用者、保持使用者和擴大整個產品生態使用量的入口。

這正好對應開放權重模型給 OpenAI 帶來的壓力。

DeepSeek、Kimi 和 Qwen 可以告訴開發者：

模型能夠帶走；

可以自己部署；

也可以選擇其他推理服務供應商。

OpenAI無法給 Luna 提供同樣的選擇。

它的回答是把“不能帶走”變得沒有那麼重要：

**如果官方服務已經足夠便宜、足夠方便，大部分普通使用者和中小開發者就沒有必要為了降低一點 token 成本，自行購買 GPU、維護推理框架和解決擴縮容問題。**

因此，Luna 的降價並不只是技術成本下降後的讓利。

它同時是封閉模型面對開放權重生態時的一種競爭策略。

## 十、DeepSeek漲價和OpenAI降價其實來自兩個不同起點

於是一個看起來很反常的局面出現了。

開放權重的 DeepSeek開始提高官方 API 價格。

封閉的 OpenAI卻開始大幅降低 Luna 的價格。

這並不矛盾。

DeepSeek已經完成了最重要的一步：模型已經走出去。

V4 權重可以進入第三方平台、企業伺服器和其他推理基礎設施，所以 DeepSeek沒有必要永遠親自提供全市場最低價的託管服務。

官方 API 可以開始承擔更多利潤回收功能。

OpenAI則正好相反。

Luna無法脫離 OpenAI控制的基礎設施自由傳播，所以 OpenAI必須主動把集中式服務做得足夠便宜。

雙方實際上從兩個不同方向走向了同一個位置：

**DeepSeek正在把過低的官方託管價格向正常商業價格拉回。**

**OpenAI正在把過去較昂貴的封閉模型呼叫價格壓向開放模型的成本區間。**

過去“開放模型便宜、閉源模型昂貴”的簡單區分因此開始失效。

## 十一、Kimi和Qwen則選擇從第三方賺到的錢裡回收研發成本

DeepSeek選擇提高官方託管價格。

Kimi則更進一步：權重可以繼續下發，但當第三方利用這些權重經營足夠大的模型服務業務以後，模型研發者直接參與收益分配。

阿里也正在向這個方向靠近。

這幾種方式放在一起，實際上已經出現了三套不同的價值回收機制。

DeepSeek的模式是：

**模型開放，官方 API 從極低價逐漸恢復商業利潤。**

Kimi正在形成的模式是：

**模型開放，普通使用繼續低門檻，大型 MaaS 與研發者分成。**

OpenAI的模式則是：

**模型不開放，由原廠控制全部推理入口，把基礎層價格壓低，再通過不同能力檔位、速度和工具體系完成價值回收。**

它們爭奪的不是同一種收入。

它們在決定**整條 AI 產業鏈裡的收費口應該放在哪裡。**

## 十二、開放權重真正進入了第二階段

這也讓最初“開放權重把蛋糕分給更多人”的判斷有了新的後半部分。

第一階段的重點是把蛋糕做大。

權重發布以後，更多雲端供應商、推理服務供應商、應用開發者和企業都能參與。

基礎模型公司主動讓出一部分對產業鏈的控制，換來更快的傳播、更廣的部署和更大的生態。

第二階段開始解決的是怎麼分錢。

模型實驗室不可能永遠依靠融資承擔鉅額研發成本；

雲端供應商不可能把全部收入交回模型公司；

推理服務供應商必須保留足夠利潤去優化基礎設施；

應用開發者也需要保留模型之上的價值。

所以開放權重最終不會走向“所有東西永遠免費”。

它更可能走向一種新的分層：

基礎研究和普通使用保持開放；

企業內部部署保持自由；

應用層繼續允許開發者創造自己的價值；

而真正依靠基礎模型本身產生巨大商業收入的環節，開始承擔更多上游研發費用。

Kimi K3 和 Qwen 正在探索的是這套分配規則。

DeepSeek則選擇先從自己的 API 開始回收。

## 十三、真正的競爭已經不只是模型性能

這一變化最後會落到開發者和使用者身上。

過去選擇模型時，主要比較能力、速度和 token 單價。

以後授權條款也會成為模型競爭力的一部分。

同樣性能的兩個開放權重模型，一個允許商業託管自由競爭，另一個要求達到一定規模後分成，第三方服務供應商最終會把授權條款成本算進價格。

同樣價格的一個開放模型和一個封閉模型，前者能夠自行部署，後者如果提供更成熟的工具、基礎設施和極低 API 成本，也可能讓自行部署失去經濟意義。

因此模型競爭越來越像一筆總賬：

性能；

推理成本；

基礎設施效率；

商業授權條款；

部署自由度；

第三方服務供應商數量；

工具生態；

以及未來離開當前平台需要付出的遷移成本。

單獨拿出“開源”“免費”或者“每百萬 token 多少錢”，已經越來越難解釋真正的選擇。

## 結語：蛋糕分出去之後，開始討論怎麼長期分

開放權重最早帶來的變化，是讓先進模型不再只能留在少數公司的伺服器裡。

模型進入更多雲平台、企業和開發者產品以後，原本高度集中的價值鏈被拆開了。基礎模型公司、雲端供應商、推理服務供應商和應用開發者都可以從不同環節獲得收入。

這塊蛋糕因此確實被做大，也被分給了更多人。

現在出現的新變化，是訓練模型的人開始重新進入已經擴大的價值鏈。

Kimi通過大型 MaaS 商業協議參與下游收入；

Qwen據報準備採用類似機制；

DeepSeek開始結束極低 API 價格承擔的擴張任務；

OpenAI則利用全端優化和巨大規模，把封閉模型的基礎使用價格繼續向下壓。

這裡沒有哪一種模式天然屬於最終答案。

但產業方向已經發生了變化：

**開放權重的競爭不再只是“誰願意把模型放出來”，而是“放出來以後，誰能建立一套讓更多人繼續分蛋糕，同時還能讓訓練下一代模型的人拿到錢的規則”。**

而 OpenAI 提出的另一種答案，則是在權重不下發的情況下，把集中式服務便宜到足以與開放生態競爭。

一邊開始從已經分出去的價值中重新取回一部分。

另一邊開始主動放棄基礎智慧原本能夠獲得的價格溢價。

看起來是漲價與降價的反方向移動，背後卻是同一件事：

**模型能力正在越來越便宜，真正重新定價的是控制權、基礎設施、商業分發和整個生態的位置。**

*封面以 [Medcom 的 Kimi K3 發布會照片](https://www.medcom.id/teknologi/news-teknologi/4ba1wEBb-ada-model-ai-baru-dari-china-moonshot-kimi-k3-penantang-gpt-dan-claude)、Reuters 報導所用的 [Qwen](https://www.marketscreener.com/news/alibaba-to-integrate-qwen-ai-with-taobao-launch-agentic-shopping-source-says-ce7f5bd8da88f423)、[DeepSeek](https://finance.yahoo.com/sectors/technology/articles/china39s-deepseek-to-make-permanent-75-price-cut-on-flagship-v4pro-ai-model-133313442.html) 與 [OpenAI](https://finance.yahoo.com/technology/ai/articles/openai-cuts-prices-smaller-models-170107549.html) 新聞影像為參考重新繪製；中央 API 與資金流表示開放權重、部署服務和模型定價之間的價值重新分配，不代表具體金額或市場數據。*

---

## 參考資料與線上連結

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
