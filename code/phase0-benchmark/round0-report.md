# Round 0 — Local Whisper (small) Benchmark — indicative results

> Audio: AI-generated TTS (Indian English + Hindi voices). Engine: faster-whisper `small`, auto language detect.
> Ye Deepgram gate NAHI hai — sirf early signal hai ki pipeline + scripts sahi hain aur Hinglish kahan mushkil hai.

| Test | Category | Detected lang | WER % | Keyterms |
|---|---|---|---|---|
| t01 | english-technical | en (0.99) | 0.0 | 3/3 |
| t02 | english-technical | en (1.0) | 27.8 | 3/5 |
| t03 | english-behavioral-numbers | en (0.99) | 0.0 | 3/3 |
| t04 | english-technical | en (1.0) | 0.0 | 4/4 |
| t05 | hinglish-code-switch | hi (0.91) | 104.8 | 0/3 |
| t06 | hinglish-code-switch | hi (0.75) | 100.0 | 0/4 |
| t07 | hinglish-hr | hi (0.9) | 109.5 | 0/2 |
| t08 | hindi-mixed | hi (0.93) | 104.5 | 0/2 |
| t09 | english-technical | en (1.0) | 0.0 | 3/3 |
| t10 | hinglish-code-switch | hi (0.81) | 104.5 | 0/2 |

## Detail

### t01 · english-technical
- Ground truth: "Can you explain how you would design a rate limiter for a distributed system using Redis, and what happens when a node fails?"
- Whisper suna: "Can you explain how you would design a rate limiter for a distributed system using Redis?  And what happens when a node fails?"
- WER: 0.0% · Keyterms: 3/3

### t02 · english-technical
- Ground truth: "What is the difference between process and thread, and when would you use multiprocessing over multithreading in Python?"
- Whisper suna: "Which is the difference between process and thread?  And when would you use multi-processing over multi-threading in python?"
- WER: 27.8% · Keyterms: 3/5

### t03 · english-behavioral-numbers
- Ground truth: "Tell me about a time you improved performance. By what percentage did latency drop, and how many requests per second were you handling?"
- Whisper suna: "Tell me about a time you improved performance.  By what percentage did latency drop?  And how many requests per second were you handling?"
- WER: 0.0% · Keyterms: 3/3

### t04 · english-technical
- Ground truth: "How does Kubernetes handle pod scheduling, and what is the role of etcd in the control plane?"
- Whisper suna: "How does Kubernetes handle pod scheduling and what is the role of ETCD in the control plane?"
- WER: 0.0% · Keyterms: 4/4

### t05 · hinglish-code-switch
- Ground truth: "Toh aap mujhe batao, aapne apne last project me database optimization kaise kiya tha, PostgreSQL me indexing use kiya tha kya?"
- Whisper suna: "तो आप मुझे बताओ, आपने अपने लास्ट प्रोजेक्त में देटेबेस अप्तमाइशेशन कैसे किया ता?  पोस्ट्क्रेस क्यूल में इंडेक्सिंग यॐस किया था क्या?"
- WER: 104.8% · Keyterms: 0/3

### t06 · hinglish-code-switch
- Ground truth: "Agar production me server down ho jaye raat ko, toh aapka approach kya hoga, pehle rollback karoge ya debugging start karoge?"
- Whisper suna: "अगर प्रडक्षन में सर्वर डाउन हो जाए राथ को, तो आपका अप्रोच क्या होगा?  पहले रोलबैक करोगे या दीबागिं स्थ करोगे?"
- WER: 100.0% · Keyterms: 0/4

### t07 · hinglish-hr
- Ground truth: "Aap apne current company me kitne saal se ho, aur aap switch kyun karna chahte ho? Expected CTC kya hai aapka?"
- Whisper suna: "अप अपने करन्त कम्पनी में किने साल से हो  और अप सविछ कुँन करना चाहते हो  अपने करन्त करन्त कुँन करना चाहते हो"
- WER: 109.5% · Keyterms: 0/2

### t08 · hindi-mixed
- Ground truth: "Aap mujhe apne baare me kuch bataiye, aapki sabse badi strength kya hai aur aap team ke saath kaise kaam karte hain?"
- Whisper suna: "आप मुझे अपने बारे में कुछ बताये, आपकी सब से बड़ी स्ट्रेंथ क्या है और आप तीम के साथ कैसे काम करते है?"
- WER: 104.5% · Keyterms: 0/2

### t09 · english-technical
- Ground truth: "Write a function that finds the longest substring without repeating characters. What will be the time complexity of your solution?"
- Whisper suna: "Write a function that finds the longest substring without repeating characters.  What will be the time complexity of your solution?"
- WER: 0.0% · Keyterms: 3/3

### t10 · hinglish-code-switch
- Ground truth: "Microservices architecture me aapne kabhi kaam kiya hai? Agar ek service fail ho jaye toh aap circuit breaker pattern kaise implement karoge?"
- Whisper suna: "मिक्रो सर्वाशाज आक्टेक्छर मी आपने कभी काम किया है  अगर एक सर्विस फेल हो जाए तो आप सर्कित ब्रेकर पाटन कैसे इंपलमेंट करोगे"
- WER: 104.5% · Keyterms: 0/2
