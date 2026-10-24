# STT Benchmark Report — 2026-10-20T06:20:45.514Z

## Per-test best run

| Test | Category | Best run | WER % | Keyterms |
|---|---|---|---|---|
| t01 | english-technical | nova-3-multilingual | 0 | 3/3 |
| t02 | english-technical | nova-3-multilingual | 0 | 5/5 |
| t03 | english-behavioral-numbers | nova-3-multilingual | 0 | 3/3 |
| t04 | english-technical | nova-3-multilingual | 0 | 4/4 |
| t05 | hinglish-code-switch | nova-3-en | 42.9 | 2/3 |
| t06 | hinglish-code-switch | nova-3-multilingual | 66.7 | 4/4 |
| t07 | hinglish-hr | nova-3-en | 47.6 | 2/2 |
| t08 | hindi-mixed | nova-3-multilingual | 90.9 | 2/2 |
| t09 | english-technical | nova-3-multilingual | 0 | 3/3 |
| t10 | hinglish-code-switch | nova-3-en | 45.5 | 2/2 |

## All runs (detail)

### t01 · nova-3-multilingual
- WER: 0% · Keyterms: 3/3
- Heard: "Can you explain how you would design a rate limiter for a distributed system using Redis? And what happens when a node fails?"

### t01 · nova-3-en
- WER: 0% · Keyterms: 3/3
- Heard: "Can you explain how you would design a rate limiter for a distributed system using Redis? And what happens when a node fails?"

### t01 · nova-3-hi
- WER: 0% · Keyterms: 3/3
- Heard: "Can you explain how you would design a rate limiter for a distributed system using ReDis? And what happens when a node fails?"

### t02 · nova-3-multilingual
- WER: 0% · Keyterms: 5/5
- Heard: "What is the difference between process and thread? And when would you use multiprocessing over multithreading in Python?"

### t02 · nova-3-en
- WER: 0% · Keyterms: 5/5
- Heard: "What is the difference between process and thread? And when would you use multiprocessing over multithreading in Python?"

### t02 · nova-3-hi
- WER: 11.1% · Keyterms: 4/5 · Missing: multithreading
- Heard: "What is the difference between process and thread? And when would you use multiprocessing over multi threading in Python?"

### t03 · nova-3-multilingual
- WER: 0% · Keyterms: 3/3
- Heard: "Tell me about a time you improved performance. By what percentage did latency drop? And how many requests per second were you handling?"

### t03 · nova-3-en
- WER: 0% · Keyterms: 3/3
- Heard: "Tell me about a time you improved performance. By what percentage did latency drop? And how many requests per second were you handling?"

### t03 · nova-3-hi
- WER: 4.3% · Keyterms: 2/3 · Missing: requests per second
- Heard: "Tell me about a time you improved performance. By what percentage did latency drop? And how many requests per 2nd were you handling?"

### t04 · nova-3-multilingual
- WER: 0% · Keyterms: 4/4
- Heard: "How does Kubernetes handle pod scheduling, and what is the role of ETCD in the control plane?"

### t04 · nova-3-en
- WER: 0% · Keyterms: 4/4
- Heard: "How does Kubernetes handle pod scheduling, and what is the role of ETCD in the control plane?"

### t04 · nova-3-hi
- WER: 5.9% · Keyterms: 3/4 · Missing: Kubernetes
- Heard: "How does Cubernetis handle pod scheduling and what is the role of ETCD in the control plane?"

### t05 · nova-3-multilingual
- WER: 76.2% · Keyterms: 2/3 · Missing: PostgreSQL
- Heard: "तो आप मुझे बताओ आपने अपने last project में database optimization कैसे किया था? Postgress QL में indexing use किया था क्या?"

### t05 · nova-3-en
- WER: 42.9% · Keyterms: 2/3 · Missing: PostgreSQL
- Heard: "To aap muje batao, apne apne last project me database optimization kasi kiata. Postgres ql me indexing use kiata kya?"

### t05 · nova-3-hi
- WER: 76.2% · Keyterms: 2/3 · Missing: PostgreSQL
- Heard: "तो आप मुझे बताओ आपने अपने last project में database optimization कैसे किया था? Postgress QL में indexing use किया था क्या?"

### t06 · nova-3-multilingual
- WER: 66.7% · Keyterms: 4/4
- Heard: "अगर production में server down हो जाए रात को तो आपका approach क्या होगा? पहले rollback करोगे या debugging start करोगे?"

### t06 · nova-3-en
- WER: 95.2% · Keyterms: 1/4 · Missing: production, rollback, debugging
- Heard: "If you are running the server, able to you approach next step."

### t06 · nova-3-hi
- WER: 66.7% · Keyterms: 4/4
- Heard: "अगर production में server down हो जाए रात को तो आपका approach क्या होगा? पहले rollback करोगे या debugging start करोगे?"

### t07 · nova-3-multilingual
- WER: 76.2% · Keyterms: 2/2
- Heard: "आप अपने current company में कितने साल से हो और आप switch क्यों करना चाहते हो? Expected CTC क्या है आपका?"

### t07 · nova-3-en
- WER: 47.6% · Keyterms: 2/2
- Heard: "Aap hapne current company Mi kitne salse ho. Aap switch kune karna chaate ho. Expected CTC Kia hapka?"

### t07 · nova-3-hi
- WER: 76.2% · Keyterms: 2/2
- Heard: "आप अपने current company में कितने साल से हो और आप switch क्यों करना चाहते हो? Expected CTC क्या है आपका?"

### t08 · nova-3-multilingual
- WER: 90.9% · Keyterms: 2/2
- Heard: "आप मुझे अपने बारे में कुछ बताइए. आपकी सबसे बड़ी strength क्या है और आप team के साथ कैसे काम करते हैं?"

### t08 · nova-3-en
- WER: 100% · Keyterms: 0/2 · Missing: strength, team
- Heard: ""

### t08 · nova-3-hi
- WER: 90.9% · Keyterms: 2/2
- Heard: "आप मुझे अपने बारे में कुछ बताइए. आपकी सबसे बड़ी strength क्या है और आप team के साथ कैसे काम करते हैं?"

### t09 · nova-3-multilingual
- WER: 0% · Keyterms: 3/3
- Heard: "Write a function that finds the longest substring without repeating characters. What will be the time complexity of your solution?"

### t09 · nova-3-en
- WER: 0% · Keyterms: 3/3
- Heard: "Write a function that finds the longest substring without repeating characters. What will be the time complexity of your solution?"

### t09 · nova-3-hi
- WER: 10% · Keyterms: 2/3 · Missing: longest substring
- Heard: "Write a function that finds the longest sub string without repeating characters. What will be the time complexity of your solution?"

### t10 · nova-3-multilingual
- WER: 72.7% · Keyterms: 1/2 · Missing: Microservices
- Heard: "Micro services architecture में आपने कभी काम किया है. अगर एक service fail हो जाए तो आप circuit breaker pattern कैसे implement करोगे?"

### t10 · nova-3-en
- WER: 45.5% · Keyterms: 2/2
- Heard: "Microservices architecture mi apne kabhi kaam ki ahai. Agar ek service fail hu jai to up circuit breaker pattern kasi implement karogay."

### t10 · nova-3-hi
- WER: 72.7% · Keyterms: 1/2 · Missing: Microservices
- Heard: "Micro services architecture में आपने कभी काम किया है. अगर एक service fail हो जाए तो आप circuit breaker pattern कैसे implement करोगे?"
