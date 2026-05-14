import { useState, useEffect, useCallback } from "react"

declare global {
  interface Window {
    chrome?: {
      storage?: {
        local?: {
          get: (keys: string | string[] | null, callback: (result: Record<string, unknown>) => void) => void;
          set: (items: Record<string, unknown>, callback?: () => void) => void;
        };
      };
    };
  }
}

interface HistoryRecord {
  id: string;
  timestamp: number;
  url: string;
  title: string;
  scrollY: number;
  index: string;
  evidence: string;
  question: string;
  answer: string;
  reference: string;
  myQuestion: string;
  aiResponse: string;
  questionType: string;
  errorCategory: string;
}

const Badge = ({ text, color = "blue" }: { text: string; color?: "blue" | "red" | "green" | "yellow" }) => {
  const colors = {
    blue: { bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF" },
    red: { bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B" },
    green: { bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46" },
    yellow: { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E" }
  }
  const c = colors[color]

  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      backgroundColor: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 500,
      color: c.text,
      whiteSpace: "nowrap"
    }}>
      {text}
    </span>
  )
}

const FloatingBall = ({ onClick, showSuccess }: { onClick: () => void; showSuccess?: boolean }) => {
  return (
    <div
      onClick={onClick}
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        width: 48,
        height: 48,
        borderRadius: "50%",
        backgroundColor: showSuccess ? "#10B981" : "#4F46E5",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: showSuccess ? 10 : 14,
        fontWeight: "bold",
        boxShadow: showSuccess
          ? "0 0 20px rgba(16, 185, 129, 0.5)"
          : "0 4px 15px rgba(79, 70, 229, 0.4)",
        cursor: "pointer",
        zIndex: 9999,
        transition: "transform 0.2s ease-in-out, box-shadow 0.3s, background-color 0.3s",
        userSelect: "none"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)"
        e.currentTarget.style.boxShadow = showSuccess
          ? "0 0 25px rgba(16, 185, 129, 0.6)"
          : "0 6px 20px rgba(79, 70, 229, 0.5)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)"
        e.currentTarget.style.boxShadow = showSuccess
          ? "0 0 20px rgba(16, 185, 129, 0.5)"
          : "0 4px 15px rgba(79, 70, 229, 0.4)"
      }}
    >
      {showSuccess ? "✓" : "9.0"}
    </div>
  )
}

// ==================== API_KEY 配置位置 ====================
const API_KEY = process.env.PLASMO_PUBLIC_DEEPSEEK_API_KEY || ""
const API_ENDPOINT = "https://api.deepseek.com/chat/completions"
// ==================== API_KEY 配置位置 ====================

const Sidebar = ({ isOpen, onClose, onSaveSuccess, onRecallSuccess }: { isOpen: boolean; onClose: () => void; onSaveSuccess: () => void; onRecallSuccess: () => void }) => {
  const [evidence, setEvidence] = useState("")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [reference, setReference] = useState("")
  const [myQuestion, setMyQuestion] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([])
  const [analyzeScrollY, setAnalyzeScrollY] = useState(0)
  const [index, setIndex] = useState("")
  const [questionType, setQuestionType] = useState("")
  const [errorCategory, setErrorCategory] = useState("")
  const [customTags, setCustomTags] = useState<string[]>([])

  const autoDetectType = (text: string) => {
    const upperText = text.toUpperCase()
    
    const typeKeywords: Record<string, string> = {
      "TRUE": "判断",
      "FALSE": "判断",
      "NOT GIVEN": "判断",
      "T/F/NG": "判断",
      "YES/NO/NOT GIVEN": "判断",
      "HEADING": "Heading",
      "MATCHING": "匹配",
      "MATCH": "匹配",
      "COMPLETE": "填空",
      "FILL IN": "填空",
      "BLANK": "填空",
      "SUMMARY": "填空",
      "MULTIPLE CHOICE": "选择",
      "CHOICE": "选择",
      "SELECT": "选择",
      "OPTION": "选择",
      "ABCD": "选择",
      "A)": "选择",
      "B)": "选择",
      "C)": "选择",
      "D)": "选择"
    }
    
    for (const [keyword, type] of Object.entries(typeKeywords)) {
      if (upperText.includes(keyword)) {
        return type
      }
    }
    
    return ""
  }

  const autoDetectCategory = (text: string) => {
    const lowerText = text.toLowerCase()
    
    const categoryKeywords: Record<string, string> = {
      "not given": "NG/F 混淆",
      "ng": "NG/F 混淆",
      "false": "NG/F 混淆",
      "过度": "过度联想",
      "联想": "过度联想",
      "推断": "过度联想",
      "同义": "同义替换",
      "替换": "同义替换",
      "paraphrase": "同义替换",
      "定位": "定位错误",
      "找不到": "定位错误",
      "词汇": "词汇",
      "单词": "词汇",
      "word": "词汇",
      "vocabulary": "词汇"
    }
    
    for (const [keyword, category] of Object.entries(categoryKeywords)) {
      if (lowerText.includes(keyword)) {
        return category
      }
    }
    
    return ""
  }

  const handleQuestionChange = (value: string) => {
    setQuestion(value)
    if (!questionType) {
      const detectedType = autoDetectType(value)
      if (detectedType) {
        setQuestionType(detectedType)
      }
    }
    if (!errorCategory) {
      const detectedCategory = autoDetectCategory(value)
      if (detectedCategory) {
        setErrorCategory(detectedCategory)
      }
    }
  }

  const handleReferenceChange = (value: string) => {
    setReference(value)
    if (!questionType) {
      const detectedType = autoDetectType(value)
      if (detectedType) {
        setQuestionType(detectedType)
      }
    }
    if (!errorCategory) {
      const detectedCategory = autoDetectCategory(value)
      if (detectedCategory) {
        setErrorCategory(detectedCategory)
      }
    }
  }

  const saveToStorage = useCallback((data: Record<string, string | number>) => {
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.set(data)
    }
  }, [])

  const loadFromStorage = useCallback((): Promise<Record<string, string | number>> => {
    return new Promise((resolve) => {
      if (window.chrome?.storage?.local) {
        window.chrome.storage.local.get([
          "evidence", "question", "answer", "reference", "myQuestion", "aiResponse", "analyzeScrollY"
        ], (result) => resolve(result as Record<string, string | number>))
      } else {
        resolve({})
      }
    })
  }, [])

  const loadHistory = useCallback((): Promise<HistoryRecord[]> => {
    return new Promise((resolve) => {
      if (window.chrome?.storage?.local) {
        window.chrome.storage.local.get("historyList", (result) => {
          resolve((result.historyList as HistoryRecord[]) || [])
        })
      } else {
        resolve([])
      }
    })
  }, [])

  const saveHistory = useCallback((record: HistoryRecord) => {
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.get("historyList", (result) => {
        const list = (result.historyList as HistoryRecord[]) || []
        list.unshift(record)
        window.chrome.storage.local.set({ historyList: list })
      })
    }
  }, [])

  const deleteHistoryRecord = useCallback((id: string) => {
    if (window.chrome?.storage?.local) {
      window.chrome.storage.local.get("historyList", (result) => {
        const list = (result.historyList as HistoryRecord[]) || []
        const filteredList = list.filter((record) => record.id !== id)
        window.chrome.storage.local.set({ historyList: filteredList })
        setHistoryList(filteredList)
      })
    }
  }, [])

  useEffect(() => {
    const initData = async () => {
      const data = await loadFromStorage()
      if (data.evidence) setEvidence(data.evidence)
      if (data.question) setQuestion(data.question)
      if (data.answer) setAnswer(data.answer)
      if (data.reference) setReference(data.reference)
      if (data.myQuestion) setMyQuestion(data.myQuestion)
      if (data.aiResponse) setAiResponse(data.aiResponse)
      if (typeof data.analyzeScrollY === "number") setAnalyzeScrollY(data.analyzeScrollY)
      
      const history = await loadHistory()
      setHistoryList(history)
      
      if (window.chrome?.storage?.local) {
        window.chrome.storage.local.get("customTags", (result) => {
          if (result.customTags && Array.isArray(result.customTags)) {
            setCustomTags(result.customTags)
          }
        })
      }
    }
    
    initData()
    
    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>, namespace: string) => {
      if (namespace === "local" && changes.historyList) {
        loadHistory().then(setHistoryList)
      }
    }
    
    if (window.chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange)
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange)
      }
    }
  }, [loadFromStorage, loadHistory])

  useEffect(() => {
    if (isOpen) {
      saveToStorage({ evidence, question, answer, reference, myQuestion, aiResponse })
    }
  }, [evidence, question, answer, reference, myQuestion, aiResponse, isOpen, saveToStorage])

  useEffect(() => {
    if (aiResponse) {
      saveToStorage({ evidence, question, answer, reference, myQuestion, aiResponse, analyzeScrollY: window.scrollY })
    }
  }, [aiResponse, saveToStorage])

  useEffect(() => {
    const handleMessage = (message: { action: string; scrollY: number }) => {
      if (message.action === "scrollTo") {
        console.log("Scrolling to:", message.scrollY)
        window.scrollTo({
          top: message.scrollY,
          behavior: "smooth"
        })
        setTimeout(() => {
          const toast = document.createElement("div")
          toast.textContent = "已回到当时录入位置"
          toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 12px 24px;
            background-color: rgba(5, 150, 105, 0.9);
            color: white;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            animation: fadeIn 0.3s ease;
          `
          document.body.appendChild(toast)
          setTimeout(() => {
            toast.style.animation = "fadeOut 0.3s ease"
            setTimeout(() => toast.remove(), 300)
          }, 1500)
        }, 100)
      }
    }

    if (window.chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage)
      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage)
      }
    }
  }, [])

  const parseIndex = (input: string): string => {
    const trimmed = input.trim()
    if (!trimmed) return ""
    
    const regex = /^(C\d+)(T\d+)(P\d+)(Q\d+)?$/
    const match = trimmed.toUpperCase().match(regex)
    if (match) {
      const parts = match.slice(1)
      return parts.join("-")
    }
    
    return trimmed
  }

  const handleSaveToLibrary = () => {
    console.log("Saving to library...")
    if (!evidence.trim() && !question.trim() && !reference.trim()) {
      alert("请至少填写一个字段")
      return
    }
    const parsedIndex = parseIndex(index)
    const record: HistoryRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      url: window.location.href,
      title: document.title,
      scrollY: analyzeScrollY || window.scrollY,
      index: parsedIndex || "",
      evidence,
      question,
      answer,
      reference,
      myQuestion,
      aiResponse,
      questionType: questionType || "",
      errorCategory: errorCategory || ""
    }
    console.log("Saving data...", record)
    saveHistory(record)
    loadHistory().then(setHistoryList)
    onSaveSuccess()
    setEvidence("")
    setQuestion("")
    setAnswer("")
    setReference("")
    setMyQuestion("")
    setAiResponse("")
    setQuestionType("")
    setErrorCategory("")
    setAnalyzeScrollY(0)
  }

  const handleLoadRecord = (record: HistoryRecord) => {
    setIndex(record.index || "")
    setEvidence(record.evidence)
    setQuestion(record.question)
    setAnswer(record.answer)
    setReference(record.reference)
    setMyQuestion(record.myQuestion)
    setAiResponse(record.aiResponse)
    setQuestionType(record.questionType || "")
    setErrorCategory(record.errorCategory || "")
    setShowHistory(false)
  }

  const handleRecall = (record: HistoryRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    if (record.url !== window.location.href) {
      window.location.href = record.url
    } else {
      window.scrollTo({ top: record.scrollY, behavior: "smooth" })
      onRecallSuccess()
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  }

  const handleAnalyze = async () => {
    if (!evidence.trim() || !question.trim() || !reference.trim()) {
      alert("请至少填写 Evidence、Question 和 Reference 三个字段")
      return
    }

    const scrollY = window.scrollY
    setAnalyzeScrollY(scrollY)
    saveToStorage({ analyzeScrollY: scrollY })
    setIsLoading(true)
    setAiResponse("")
    setQuestionType("")
    setErrorCategory("")

    const prompt = `
你是一位极度耐心且懂雅思考试逻辑的私人教练。

请帮我深度分析以下雅思题目：

---

【原文证据】
${evidence}

【题目】
${question}

【用户提供的正确答案】
${answer}

【第三方解析】
${reference}

${myQuestion ? `【我的疑问】\n${myQuestion}\n` : ""}

---

用户提供了正确答案 [${answer}]，请结合题目、答案和原文证据，深挖第三方解析中的逻辑漏洞，解释正确选项的必然性。

请按照以下规则进行分析：
1. 严禁机械重复原文或解析内容
2. 必须结合原文证据来拆解第三方解析中的因果逻辑
3. 用白话解释清楚为什么选某个选项而不选其他选项
4. 重点分析逻辑转折词和程度词陷阱
5. 模拟一对一辅导的口吻，用通俗易懂的语言解释

---

重要要求：
请在分析的最开头，使用以下格式提供两个标签：
[题型]: <例如：判断题 T/F/NG、单选题、填空题、配对题等>
[错误原因]: <例如：NG/F 区分模糊、同义替换识别失败、逻辑断层、程度词陷阱等>

然后再开始你的深度解读。
    `.trim()

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "你是一位极度耐心且懂雅思考试逻辑的私人教练。你的任务是帮助雅思考生深入理解错题背后的逻辑，用通俗易懂的语言解释为什么选A而不选B。"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 4096,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const fullResponse = data.choices?.[0]?.message?.content || "未能获取到 AI 回复"
      
      let type = ""
      let category = ""
      let content = fullResponse
      
      const typeMatch = fullResponse.match(/\[题型\]:\s*(.+)/)
      if (typeMatch) {
        type = typeMatch[1].trim()
        content = content.replace(typeMatch[0], "").trim()
      }
      
      const categoryMatch = fullResponse.match(/\[错误原因\]:\s*(.+)/)
      if (categoryMatch) {
        category = categoryMatch[1].trim()
        content = content.replace(categoryMatch[0], "").trim()
      }
      
      setQuestionType(type)
      setErrorCategory(category)
      setAiResponse(content)
    } catch (error) {
      console.error("API 调用失败:", error)
      setAiResponse("AI 解析失败，请检查网络连接或 API Key 是否正确。\n\n错误信息: " + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>")
      .replace(/^(#{1,6})\s+(.*$)/gm, (match, p1, p2) => {
        const level = p1.length
        return `<h${level} style="margin: 16px 0 8px; font-size: ${24 - level * 2}px; font-weight: 600;">${p2}</h${level}>`
      })
      .replace(/^(\d+\.)\s+(.*$)/gm, "<li style='margin-left: 20px;'>$1 $2</li>")
      .replace(/^(-)\s+(.*$)/gm, "<li style='margin-left: 20px; list-style-type: disc;'>$2</li>")

    return { __html: html }
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          transition: "opacity 0.3s, visibility 0.3s"
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 380,
          height: "100vh",
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          zIndex: 9999,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "-8px 0 40px rgba(0, 0, 0, 0.08)",
          overflowY: "auto",
          overflowX: "hidden"
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            padding: "16px 20px",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
              ACE notes
            </h2>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                background: showHistory ? "#3b82f6" : "#f8fafc",
                border: "1px solid",
                borderColor: showHistory ? "#3b82f6" : "#e2e8f0",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 12,
                cursor: "pointer",
                color: showHistory ? "white" : "#64748b",
                display: "flex",
                alignItems: "center",
                gap: 4,
                transition: "all 0.2s",
                fontWeight: 500
              }}
            >
              {showHistory ? "← 返回" : "📚 历史"}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => chrome.runtime.sendMessage({ action: "open_dashboard" })}
              style={{
                fontSize: 14,
                padding: "6px 10px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                cursor: "pointer",
                color: "#64748b",
                transition: "all 0.2s"
              }}
              title="全屏复习"
            >
              ↗
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
                color: "#94a3b8",
                padding: "6px 10px",
                lineHeight: 1,
                transition: "all 0.2s"
              }}
              title="关闭"
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: "20px 20px 24px" }}>
          {showHistory ? (
            <div>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                历史记录 ({historyList.length} 条)
              </h3>
              {historyList.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 14 }}>暂无历史记录</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {historyList.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => handleLoadRecord(record)}
                      style={{
                        padding: 14,
                        backgroundColor: "white",
                        border: "1px solid #f1f5f9",
                        borderRadius: 10,
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#3b82f6"
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(59, 130, 246, 0.1)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#f1f5f9"
                        e.currentTarget.style.boxShadow = "none"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                            {formatDate(record.timestamp)}
                          </div>
                          <div style={{ fontSize: 13, color: "#334155", fontWeight: 500, marginBottom: 6 }}>
                            {record.index || "无索引"}
                          </div>
                          {(record.questionType || record.errorCategory) && (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {record.questionType && (
                                <span style={{
                                  padding: "2px 8px",
                                  borderRadius: 12,
                                  fontSize: 11,
                                  backgroundColor: "#dbeafe",
                                  color: "#2563eb"
                                }}>
                                  {record.questionType}
                                </span>
                              )}
                              {record.errorCategory && (
                                <span style={{
                                  padding: "2px 8px",
                                  borderRadius: 12,
                                  fontSize: 11,
                                  backgroundColor: "#fce7f3",
                                  color: "#db2777"
                                }}>
                                  {record.errorCategory}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={(e) => handleRecall(record, e)}
                            style={{
                              padding: "4px 6px",
                              backgroundColor: "#f0f9ff",
                              border: "1px solid #e0f2fe",
                              borderRadius: 6,
                              cursor: "pointer",
                              color: "#0ea5e9",
                              fontSize: 11
                            }}
                            title="回到现场"
                          >
                            📍
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm("确定要删除这条记录吗？")) {
                                deleteHistoryRecord(record.id)
                              }
                            }}
                            style={{
                              padding: "4px 6px",
                              backgroundColor: "#fef2f2",
                              border: "1px solid #fee2e2",
                              borderRadius: 6,
                              cursor: "pointer",
                              color: "#ef4444",
                              fontSize: 11
                            }}
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="text"
                    value={index}
                    onChange={(e) => setIndex(e.target.value)}
                    placeholder="C18-T1-P1-Q5"
                    style={{
                      width: 100,
                      height: 32,
                      padding: "0 10px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      fontSize: 13,
                      boxSizing: "border-box",
                      backgroundColor: "#f8fafc",
                      color: "#0f172a",
                      fontWeight: 500
                    }}
                  />
                  <button
                    onClick={() => {
                      const selection = window.getSelection()
                      if (selection && selection.toString()) {
                        setIndex(selection.toString().trim())
                      }
                    }}
                    style={{
                      fontSize: 11,
                      padding: "6px 10px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      cursor: "pointer",
                      color: "#64748b"
                    }}
                  >
                    同步选中
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  题目
                </label>
                <textarea
                  value={question}
                  onChange={(e) => handleQuestionChange(e.target.value)}
                  placeholder="输入题目内容..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 13,
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    backgroundColor: "white",
                    lineHeight: 1.5
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  答案
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="输入答案..."
                  rows={1}
                  style={{
                    width: "100%",
                    padding: 8,
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    fontSize: 13,
                    resize: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    backgroundColor: "#f8fafc",
                    lineHeight: 1.5
                  }}
                />
              </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              原文证据
            </label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="输入原文证据..."
              style={{
                width: "100%",
                height: 90,
                padding: 10,
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
                backgroundColor: "white",
                lineHeight: 1.5
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              解析
            </label>
            <textarea
              value={reference}
              onChange={(e) => handleReferenceChange(e.target.value)}
              placeholder="输入第三方解析..."
              style={{
                width: "100%",
                height: 70,
                padding: 10,
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
                backgroundColor: "white",
                lineHeight: 1.5
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              我的疑问 / 心得
            </label>
            <textarea
              value={myQuestion}
              onChange={(e) => setMyQuestion(e.target.value)}
              placeholder="记录你的疑问或学习心得..."
              style={{
                width: "100%",
                height: 60,
                padding: 10,
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
                backgroundColor: "#fafafa",
                lineHeight: 1.5
              }}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: isLoading ? "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)" : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            {isLoading ? (
              <>
                <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                深度解析中...
              </>
            ) : (
              <>🤖 DeepSeek 深度解析</>
            )}
          </button>

          {aiResponse && (
            <div style={{ marginTop: 16, padding: 14, backgroundColor: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span>✨</span> AI 解读
              </div>
              <div style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: "#334155",
                whiteSpace: "pre-wrap"
              }}>
                {aiResponse}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                题型
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["判断", "选择", "填空", "匹配", "Heading"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setQuestionType(questionType === type ? "" : type)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 16,
                      fontSize: 12,
                      border: "1px solid",
                      borderColor: questionType === type ? "#3b82f6" : "#e2e8f0",
                      backgroundColor: questionType === type ? "#dbeafe" : "white",
                      color: questionType === type ? "#2563eb" : "#64748b",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontWeight: questionType === type ? 600 : 400
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                错因
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["NG/F混淆", "过度联想", "同义替换", "定位错误", "词汇", ...customTags].map((category) => (
                  <button
                    key={category}
                    onClick={() => setErrorCategory(errorCategory === category ? "" : category)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 16,
                      fontSize: 12,
                      border: "1px solid",
                      borderColor: errorCategory === category ? "#ec4899" : "#e2e8f0",
                      backgroundColor: errorCategory === category ? "#fce7f3" : "white",
                      color: errorCategory === category ? "#db2777" : "#64748b",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontWeight: errorCategory === category ? 600 : 400
                    }}
                  >
                    {category}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const newTag = prompt("请输入自定义错误原因标签：")
                    if (newTag && newTag.trim()) {
                      const trimmedTag = newTag.trim()
                      if (!customTags.includes(trimmedTag)) {
                        const updatedTags = [...customTags, trimmedTag]
                        setCustomTags(updatedTags)
                        if (window.chrome?.storage?.local) {
                          chrome.storage.local.set({ customTags: updatedTags })
                        }
                      }
                    }
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 16,
                    fontSize: 12,
                    border: "1px dashed #cbd5e1",
                    backgroundColor: "transparent",
                    color: "#94a3b8",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  + 自定义
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveToLibrary}
            style={{
              width: "100%",
              marginTop: 20,
              padding: "13px 16px",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            💾 存入错题库
          </button>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "10px 16px",
              backgroundColor: "transparent",
              color: "#94a3b8",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
          >
            关闭
          </button>
          </>
          )}
        </div>
      </div>
    </>
  )
}

const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        padding: "12px 24px",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        borderRadius: 8,
        fontSize: 14,
        zIndex: 10000,
        animation: "fadeIn 0.2s ease-in"
      }}
    >
      {message}
    </div>
  )
}

function ContentScript() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 1500)
  }

  return (
    <>
      <FloatingBall onClick={() => setIsSidebarOpen(true)} showSuccess={showSuccess} />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSaveSuccess={() => {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 2000)
        }}
        onRecallSuccess={() => showToast("已回到当时录入位置")}
      />
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </>
  )
}

export default ContentScript
