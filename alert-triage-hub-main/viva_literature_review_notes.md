# 📚 Literature Review — Viva Cheat Sheet
### Project: Sentinel Alert Triage Hub

---

## Paper 1 — Subrahmanian et al. (2021) — *Alert Management in SOCs*
- Studied **12 real SOCs** and interviewed **47 analysts**
- Found analysts spend **less than 4 minutes per alert** → 67% miss rate on real threats
- Key takeaway: **"The solution is not a faster analyst, it's a smarter pre-filter"**
- Our Hub applies this via **asset-criticality scoring** before showing alerts to analysts

---

## Paper 2 — Veeramachaneni et al. (2022) — *AACT (Machine Learning Triage)*
- Built a **Random Forest ML model** that learned from past analyst decisions
- Trained on **1.2 million real SOC alerts**, suppressed **60% of low-value alerts** with only 2% false negatives
- Reduced **MTTR (Mean Time to Respond) by 41%** in live A/B testing
- Limitation: Model learns bad habits if analysts were historically lazy — **"garbage in, garbage out"**

---

## Paper 3 — Al-Mohannadi et al. (2022) — *SOAR Efficiency Analysis*
- Studied **7 enterprise SOAR deployments** and measured KPIs like MTTR and false positive rate
- SOAR reduced MTTR by **52%** — but only for well-defined, known attack types
- Coined the term **"Playbook Brittleness"** — SOAR fails completely on new/novel threats
- Our Hub addresses this with **AI reasoning** instead of rigid playbooks

---

## Paper 4 — Aghaei et al. (2023) — *SecureBERT (Domain-Specific LLM)*
- A **BERT model retrained on cybersecurity text** — CVEs, MITRE ATT&CK, threat reports
- Outperformed general BERT by **11.3 F1 points** on cybersecurity NLP tasks
- Key point: A general AI doesn't understand the word "trojan" as malware vs. everyday use
- This justifies why our Hub uses **domain-specific prompting** in its AI Triage Engine

---

## Paper 5 — Deng et al. (2024) — *PentestGPT (GPT-4 for Security)*
- Used GPT-4 to do **automated penetration testing** on HackTheBox challenges
- Raw GPT-4 completed only **30%** of tasks; their structured framework achieved **67%**
- The trick: **Breaking complex tasks into a hierarchy of sub-tasks** (like a task tree)
- Our Hub uses the same idea — AI evaluates investigations by **sub-criteria** (completeness, accuracy, escalation quality) not just one big score

---

## Paper 6 — Osei-Bonsu et al. (2025) — *SOAR Use Case Automation*
- Tested SOAR on phishing, brute force, port scanning alerts
- For known attacks: **90%+ automation accuracy**; for polymorphic/obfuscated attacks: drops to **below 55%**
- Recommends **"graduated automation"** — automate simple, route complex to humans
- Our Hub's **4-tier severity system** (Critical → Low) implements this exact model

---

## Paper 7 — Xiong & Lagerström (2022) — *XAI (Explainable AI) in Cybersecurity*
- Reviewed **43 AI security tools** and found two types of AI explanations: **operational** (for analysts) and **strategic** (for managers/audits)
- Key stat: AI systems with **natural-language explanations** had **40% higher analyst acceptance** than those showing only a number/score
- Identified the **"Explanation Paradox"** — the most accurate AI models (deep learning) are the least explainable
- Our Hub gives analysts a **written reason for every AI score**, not just a number — directly from this finding

---

## Paper 8 — Husák et al. (2022) — *Contextual Alert Prioritization*
- Built a framework combining **asset criticality + threat intelligence + time patterns** to score alerts
- Reduced the daily analyst review queue by **73%** while maintaining **98.5% true positive detection**
- Formalized **"alert enrichment"** as a must-do step before any human sees an alert
- Our Hub's **Asset Criticality Tracking** is a direct implementation of this framework

---

## Paper 9 — Ibrahim et al. (2023) — *FACPF (Federated AI Prioritization)*
- Proposed using **Reinforcement Learning + Graph Neural Networks + Federated Learning** for SOC alert management
- Federated Learning means multiple organizations can **share a model without sharing sensitive data**
- GNNs model the **network topology** to spot lateral movement between machines
- Our Hub is a **practical stepping stone** toward this advanced future architecture

---

## Paper 10 — Park et al. (2024) — *LLM Agents for SOC Automation*
- Built a **ReAct (Reason + Act) LLM agent** that could log into a SIEM, pull logs, correlate events, and write incident reports — autonomously
- Completed **71% of Level-1 triage tasks** without human input
- Major problem: **Hallucination** — agent sometimes fabricated log entries that didn't exist
- Solution: A **"verification layer"** (second AI checks the first AI's facts) — our Hub applies this by grounding AI evaluation strictly in the actual alert data

---

## 🎯 3 Key Points to Remember for Any Question

> 1. **Alert Fatigue** — the #1 problem in every paper. Analysts are overwhelmed → they miss real threats.
> 2. **Our Hub's unique contribution** — we're the only system that gives analysts **qualitative AI feedback on their own investigation quality**, not just a ticket queue cleaner.
> 3. **Why LLMs instead of ML rules** — because ML rules are rigid (playbook brittleness) and LLMs can reason about **any novel alert type** with domain-specific prompting.

---

## 🔑 Important Terms to Know

| Term | Meaning |
|------|---------|
| **MTTR** | Mean Time to Respond — how fast an incident is resolved |
| **SIEM** | Security Info & Event Management — collects all logs |
| **SOAR** | Security Orchestration, Automation & Response — automates responses |
| **Alert Fatigue** | Analysts becoming numb/overwhelmed by too many alerts |
| **True Positive (TP)** | A real threat that was correctly detected |
| **False Positive (FP)** | A fake/benign event incorrectly flagged as a threat |
| **Playbook Brittleness** | SOAR rules break when attack types change |
| **XAI** | Explainable AI — AI that shows its reasoning |
| **ReAct** | Reason + Act — LLM pattern for step-by-step problem solving |
| **Federated Learning** | Training an AI across organizations without sharing raw data |
| **Asset Criticality** | How important/valuable the attacked system is to the business |
