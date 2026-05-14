import { useState, useEffect, useMemo } from "react"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts"

interface SynonymRecord {
  id: string;
  timestamp: number;
  originalWord: string;
  questionWord: string;
  index: string;
  context: string;
}

interface VocabRecord {
  id: string;
  timestamp: number;
  word: string;
  meaning: string;
  context: string;
  index: string;
}

interface HistoryRecord {
  id: string
  index: string
  question: string
  answer: string
  evidence: string
  reference: string
  myQuestion: string
  aiResponse: string
  questionType: string
  errorCategory: string
  url: string
  title: string
  scrollY: number
  timestamp: number
  synonyms?: SynonymRecord[]
  vocabulary?: VocabRecord[]
}

const Dashboard = () => {
  const [activeNav, setActiveNav] = useState("kanban")
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [editingStates, setEditingStates] = useState<Map<string, { field: string; value: string }>>(new Map())
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [synonymList, setSynonymList] = useState<SynonymRecord[]>([])
  const [vocabList, setVocabList] = useState<VocabRecord[]>([])

  useEffect(() => {
    loadHistory()
    loadSynonyms()
    loadVocab()
  }, [])

  const loadHistory = async () => {
    if (window.chrome?.storage?.local) {
      const result = await new Promise((resolve) => {
        window.chrome.storage.local.get("historyList", resolve)
      })
      const data = result as { historyList?: HistoryRecord[] }
      setHistoryList(data.historyList || [])
    }
  }

  const loadSynonyms = async () => {
    if (window.chrome?.storage?.local) {
      const result = await new Promise((resolve) => {
        window.chrome.storage.local.get("synonymList", resolve)
      })
      const data = result as { synonymList?: SynonymRecord[] }
      setSynonymList(data.synonymList || [])
    }
  }

  const loadVocab = async () => {
    if (window.chrome?.storage?.local) {
      const result = await new Promise((resolve) => {
        window.chrome.storage.local.get("vocabList", resolve)
      })
      const data = result as { vocabList?: VocabRecord[] }
      setVocabList(data.vocabList || [])
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, "0")}`
  }

  const toggleCard = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleRecall = (record: HistoryRecord) => {
    if (window.chrome?.tabs) {
      chrome.tabs.query({ url: record.url }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id!, { active: true }, () => {
            chrome.tabs.sendMessage(tabs[0].id!, { 
              action: "scrollTo", 
              scrollY: record.scrollY 
            })
          })
        } else {
          chrome.tabs.create({ url: record.url, active: true }, (newTab) => {
            setTimeout(() => {
              chrome.tabs.sendMessage(newTab.id!, { 
                action: "scrollTo", 
                scrollY: record.scrollY 
              })
            }, 1000)
          })
        }
      })
    }
  }

  const startEdit = (id: string, field: string, value: string) => {
    setEditingStates(prev => {
      const newMap = new Map(prev)
      newMap.set(id, { field, value })
      return newMap
    })
  }

  const cancelEdit = (id: string) => {
    setEditingStates(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
  }

  const saveEdit = async (id: string) => {
    const editState = editingStates.get(id)
    if (!editState) return

    const updatedList = historyList.map(record => {
      if (record.id === id) {
        return { ...record, [editState.field]: editState.value }
      }
      return record
    })

    await chrome.storage.local.set({ historyList: updatedList })
    setHistoryList(updatedList)
    setEditingStates(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
    
    setToastMessage("修改成功")
    setShowToast(true)
    setTimeout(() => setShowToast(false), 1500)
  }

  const deleteRecord = async (id: string) => {
    const updatedList = historyList.filter(record => record.id !== id)
    await chrome.storage.local.set({ historyList: updatedList })
    setHistoryList(updatedList)
    setToastMessage("删除成功")
    setShowToast(true)
    setTimeout(() => setShowToast(false), 1500)
  }

  const getQuestionTypeStyle = (type: string) => {
    const styles: Record<string, { bg: string; text: string; border: string }> = {
      "判断": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
      "选择": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
      "填空": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
      "匹配": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
      "Heading": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" }
    }
    return styles[type] || { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" }
  }

  const getErrorCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; text: string; border: string }> = {
      "NG/F混淆": { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
      "同义替换": { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
      "逻辑断层": { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
      "过度联想": { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
      "定位错误": { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
      "词汇": { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" }
    }
    return styles[category] || { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" }
  }

  const errorCategoryData = useMemo(() => {
    const categoryCount: Record<string, number> = {}
    historyList.forEach(record => {
      if (record.errorCategory) {
        categoryCount[record.errorCategory] = (categoryCount[record.errorCategory] || 0) + 1
      }
    })
    return Object.entries(categoryCount).map(([name, value]) => ({ name, value }))
  }, [historyList])

  const mostFrequentCategory = useMemo(() => {
    if (errorCategoryData.length === 0) return null
    return errorCategoryData.reduce((a, b) => a.value > b.value ? a : b, errorCategoryData[0])
  }, [errorCategoryData])

  const latestAiInsight = useMemo(() => {
    const recordsWithAi = historyList.filter(r => r.aiResponse && r.aiResponse.trim())
    if (recordsWithAi.length === 0) return null
    const latest = recordsWithAi.reduce((a, b) => a.timestamp > b.timestamp ? a : b)
    return latest.aiResponse.substring(0, 100) + "..."
  }, [historyList])

  const synonymCount = useMemo(() => {
    return historyList.filter(r => r.errorCategory === "同义替换").length
  }, [historyList])

  const streakDays = useMemo(() => {
    if (historyList.length === 0) return 0
    
    const dates = [...new Set(historyList.map(r => {
      const d = new Date(r.timestamp)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    }))].sort().reverse()
    
    let streak = 0
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)
      const expectedStr = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, "0")}-${String(expectedDate.getDate()).padStart(2, "0")}`
      
      if (dates.includes(expectedStr)) {
        streak++
      } else {
        break
      }
    }
    
    return streak
  }, [historyList])

  const filteredHistoryList = useMemo(() => {
    if (!filterCategory) return historyList
    return historyList.filter(r => r.errorCategory === filterCategory)
  }, [historyList, filterCategory])

  const monthlyCalendarData = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    const recordCountMap: Record<string, number> = {}
    historyList.forEach(r => {
      const d = new Date(r.timestamp)
      const dateStr = d.toISOString().slice(0, 10)
      recordCountMap[dateStr] = (recordCountMap[dateStr] || 0) + 1
    })

    const dates: { date: string; day: number; recordCount: number; isCurrentMonth: boolean }[] = []

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      dates.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        day: d.getDate(),
        recordCount: 0,
        isCurrentMonth: false
      })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const recordCount = recordCountMap[dateStr] || 0
      dates.push({
        date: dateStr,
        day,
        recordCount,
        isCurrentMonth: true
      })
    }

    const remainingDays = 42 - dates.length
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i)
      dates.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        day: d.getDate(),
        recordCount: 0,
        isCurrentMonth: false
      })
    }

    return dates
  }, [historyList])

  const getDotColor = (recordCount: number) => {
    if (recordCount === 0) return "transparent"
    if (recordCount === 1) return "#86efac"
    if (recordCount === 2) return "#22c55e"
    if (recordCount === 3) return "#16a34a"
    return "#15803d"
  }

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      "NG/F混淆": "#FCA5A5",
      "过度联想": "#FBBF24",
      "同义替换": "#34D399",
      "定位错误": "#60A5FA",
      "词汇": "#C084FC",
      "逻辑断层": "#FB7185"
    }
    const defaultColors = ["#FCA5A5", "#FBBF24", "#34D399", "#60A5FA", "#C084FC", "#FB7185", "#38BDF8", "#F97316"]
    const index = errorCategoryData.findIndex(d => d.name === category)
    return colorMap[category] || defaultColors[index % defaultColors.length]
  }

  const navItems = [
    { id: "kanban", label: "概览看板", icon: "📊" },
    { id: "wrongBook", label: "错题库", icon: "📚" },
    { id: "corpus", label: "语料中心", icon: "📖" },
    { id: "settings", label: "设置", icon: "⚙️" }
  ]

  const corpusTabs = [
    { id: "vocab", label: "生词本" },
    { id: "synonym", label: "同义替换" }
  ]

  const [activeCorpusTab, setActiveCorpusTab] = useState("vocab")

  const handleCategoryCardClick = () => {
    if (mostFrequentCategory) {
      setFilterCategory(mostFrequentCategory.name)
      setActiveNav("wrongBook")
    }
  }

  const handlePieClick = (data: { name: string }) => {
    setFilterCategory(data.name)
    setActiveNav("wrongBook")
  }

  const clearFilter = () => {
    setFilterCategory(null)
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", backgroundColor: "#f8fafc", overflow: "hidden", boxSizing: "border-box" }}>
      <nav style={{
        width: "240px",
        backgroundColor: "#ffffff",
        color: "#1f2937",
        padding: "0",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #f1f5f9"
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#1e293b" }}>
            ✨ ACE notes
          </h1>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>v2.0</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div style={{ flexShrink: 0 }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveNav(item.id)
                if (item.id !== "wrongBook") {
                  setFilterCategory(null)
                }
              }}
              style={{
                width: "100%",
                padding: "10px 24px",
                textAlign: "left",
                backgroundColor: activeNav === item.id ? "#eff6ff" : "transparent",
                border: "none",
                color: activeNav === item.id ? "#2563eb" : "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "all 0.15s",
                fontSize: 14,
                fontWeight: activeNav === item.id ? 600 : 500
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          </div>
        </div>

        <div style={{ padding: "12px", borderTop: "1px solid #f1f5f9", backgroundColor: "#fafafa", flexShrink: 0 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            📅 日历打卡
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", marginBottom: 4 }}>
            {["一", "二", "三", "四", "五", "六", "日"].map((day, idx) => (
              <span key={idx} style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", padding: "2px 0" }}>{day}</span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px" }}>
            {monthlyCalendarData.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "2px 1px",
                  borderRadius: 4,
                  backgroundColor: item.isCurrentMonth && item.recordCount > 0 ? "#f0fdf4" : "transparent",
                  cursor: item.isCurrentMonth ? "pointer" : "default",
                  minHeight: 26
                }}
              >
                <span style={{
                  fontSize: 10,
                  color: item.isCurrentMonth ? (item.recordCount > 0 ? "#166534" : "#64748b") : "#e2e8f0",
                  fontWeight: item.recordCount > 0 ? 600 : 400
                }}>
                  {item.day}
                </span>
                {item.isCurrentMonth && item.recordCount > 0 && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: getDotColor(item.recordCount),
                      marginTop: 2
                    }}
                  />
                )}
                {item.isCurrentMonth && item.recordCount === 0 && (
                  <div style={{ width: 6, height: 6, marginTop: 2 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: "24px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "auto" }}>
        {activeNav === "kanban" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                欢迎回来，今日复盘重点已就绪
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                共 {historyList.length} 道错题等待深度分析
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <div 
                onClick={handleCategoryCardClick}
                style={{ 
                  backgroundColor: "#ffffff", 
                  borderRadius: 12, 
                  padding: 20, 
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  cursor: mostFrequentCategory ? "pointer" : "default",
                  transition: "all 0.15s",
                  border: "1px solid #f1f5f9"
                }}
                onMouseEnter={(e) => {
                  if (mostFrequentCategory) {
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)"
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 20 }}>🔥</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>最常错点</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                  {mostFrequentCategory?.value || 0}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  {mostFrequentCategory?.name || "-"}
                </div>
              </div>

              <div style={{ 
                backgroundColor: "#ffffff", 
                borderRadius: 12, 
                padding: 20, 
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                border: "1px solid #f1f5f9"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 20 }}>🤖</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>逻辑盲区</span>
                </div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                  {latestAiInsight || "暂无 AI 分析"}
                </div>
              </div>

              <div style={{ 
                backgroundColor: "#ffffff", 
                borderRadius: 12, 
                padding: 20, 
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                border: "1px solid #f1f5f9"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 20 }}>🔄</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>同义替换</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                  {synonymCount}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  已录入同义词对
                </div>
              </div>

              <div style={{ 
                backgroundColor: "#ffffff", 
                borderRadius: 12, 
                padding: 20, 
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                border: "1px solid #f1f5f9"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 20 }}>🏆</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>复盘勋章</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                  {streakDays}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  连续复盘天数
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div style={{ 
                backgroundColor: "#ffffff", 
                borderRadius: 12, 
                padding: 24, 
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                border: "1px solid #f1f5f9"
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 20 }}>
                  📊 错因分布
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={errorCategoryData}
                      cx="35%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      onClick={handlePieClick}
                    >
                      {errorCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} 条`, "数量"]}
                      contentStyle={{ 
                        backgroundColor: "white", 
                        border: "1px solid #f1f5f9", 
                        borderRadius: 8,
                        padding: "12px"
                      }}
                    />
                    <Legend 
                      layout="vertical" 
                      verticalAlign="middle" 
                      align="right"
                      wrapperStyle={{ paddingLeft: 0, paddingRight: 10 }}
                      iconType="circle"
                      iconSize={10}
                      formatter={(value) => <span style={{ fontSize: 12, color: "#475569" }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ 
                backgroundColor: "#ffffff", 
                borderRadius: 12, 
                padding: 24, 
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                border: "1px solid #f1f5f9"
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 20 }}>
                  📈 最新错题
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, overflowY: "auto" }}>
                  {historyList.slice(0, 8).map((record) => {
                    const typeStyle = getQuestionTypeStyle(record.questionType)
                    return (
                      <div 
                        key={record.id}
                        onClick={() => {
                          setActiveNav("wrongBook")
                          setExpandedIds(new Set([record.id]))
                        }}
                        style={{ 
                          padding: 12, 
                          backgroundColor: "#fafafa", 
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          border: "1px solid #f1f5f9"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", flex: 1 }}>
                            {record.index || "无索引"}
                          </span>
                          {record.questionType && (
                            <span style={{
                              padding: "3px 8px",
                              borderRadius: 12,
                              fontSize: 10,
                              backgroundColor: typeStyle.bg,
                              color: typeStyle.text,
                              fontWeight: 500
                            }}>
                              {record.questionType}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {formatDate(record.timestamp)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeNav === "wrongBook" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  📚 错题库
                </h2>
                <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                  {filterCategory ? `筛选: ${filterCategory} (${filteredHistoryList.length} 条)` : `共 ${historyList.length} 条错题`}
                </p>
              </div>
              {filterCategory && (
                <button
                  onClick={clearFilter}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 10,
                    fontSize: 13,
                    color: "#2563eb",
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "all 0.15s"
                  }}
                >
                  取消筛选
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredHistoryList.length === 0 ? (
                <div style={{ 
                  backgroundColor: "#ffffff", 
                  borderRadius: 12, 
                  padding: 60, 
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  border: "1px solid #f1f5f9",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                  <p style={{ color: "#64748b", fontSize: 16, margin: 0 }}>
                    {filterCategory ? "该分类下暂无错题记录" : "暂无错题记录"}
                  </p>
                  <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>
                    开始你的错题收集之旅吧！
                  </p>
                </div>
              ) : (
                filteredHistoryList.map((record) => {
                  const isExpanded = expandedIds.has(record.id)
                  const typeStyle = getQuestionTypeStyle(record.questionType)
                  const catStyle = getErrorCategoryStyle(record.errorCategory)
                  
                  return (
                    <div
                      key={record.id}
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 12,
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                        border: "1px solid #f1f5f9",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                      onClick={() => toggleCard(record.id)}
                    >
                      <div style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                                {record.index || "无索引"}
                              </span>
                              <span style={{ fontSize: 10, color: "#cbd5e1" }}>{formatDate(record.timestamp)}</span>
                            </div>
                            {record.questionType && (
                              <span style={{
                                padding: "3px 8px",
                                borderRadius: 12,
                                fontSize: 10,
                                backgroundColor: typeStyle.bg,
                                color: typeStyle.text,
                                fontWeight: 500,
                                border: `1px solid ${typeStyle.border}`
                              }}>
                                {record.questionType}
                              </span>
                            )}
                            {record.errorCategory && (
                              <span style={{
                                padding: "3px 8px",
                                borderRadius: 12,
                                fontSize: 10,
                                backgroundColor: catStyle.bg,
                                color: catStyle.text,
                                fontWeight: 500,
                                border: `1px solid ${catStyle.border}`
                              }}>
                                {record.errorCategory}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRecall(record)
                              }}
                              style={{
                                width: 32,
                                height: 32,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 6,
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "#6b7280",
                                transition: "all 0.15s"
                              }}
                              title="回到现场"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f3f4f6"
                                e.currentTarget.style.color = "#374151"
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent"
                                e.currentTarget.style.color = "#6b7280"
                              }}
                            >
                              <span>📍</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                startEdit(record.id, "myQuestion", record.myQuestion || "")
                              }}
                              style={{
                                width: 32,
                                height: 32,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 6,
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "#6b7280",
                                transition: "all 0.15s"
                              }}
                              title="编辑笔记"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f3f4f6"
                                e.currentTarget.style.color = "#374151"
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent"
                                e.currentTarget.style.color = "#6b7280"
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm("确定要删除这条记录吗？")) {
                                  deleteRecord(record.id)
                                }
                              }}
                              style={{
                                width: 32,
                                height: 32,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 6,
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "#6b7280",
                                transition: "all 0.15s"
                              }}
                              title="删除记录"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#fee2e2"
                                e.currentTarget.style.color = "#dc2626"
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent"
                                e.currentTarget.style.color = "#6b7280"
                              }}
                            >
                              🗑️
                            </button>
                            <span style={{
                              fontSize: 12,
                              color: "#94a3b8",
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.15s"
                            }}>
                              ▼
                            </span>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ 
                          padding: "0 16px 16px",
                          borderTop: "1px solid #f1f5f9",
                          animation: "slideDown 0.15s ease"
                        }}>
                          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                            {record.question && (
                              <div>
                                <h4 style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Question
                                </h4>
                                <div style={{ 
                                  fontSize: 14, 
                                  color: "#1e293b", 
                                  lineHeight: 1.6,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  padding: "14px",
                                  backgroundColor: "#fafafa",
                                  borderRadius: 8,
                                  border: "1px solid #f1f5f9"
                                }}>
                                  {record.question}
                                </div>
                              </div>
                            )}

                            {record.answer && (
                              <div>
                                <h4 style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Answer
                                </h4>
                                <div style={{ 
                                  fontSize: 14, 
                                  color: "#059669", 
                                  fontWeight: 500,
                                  padding: "14px",
                                  backgroundColor: "#f0fdf4",
                                  borderRadius: 8,
                                  border: "1px solid #d1fae5"
                                }}>
                                  {record.answer}
                                </div>
                              </div>
                            )}

                            {record.evidence && (
                              <div>
                                <h4 style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Evidence
                                </h4>
                                <div style={{ 
                                  fontSize: 14, 
                                  color: "#475569", 
                                  lineHeight: 1.6,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  padding: "14px",
                                  backgroundColor: "#fafafa",
                                  borderRadius: 8,
                                  border: "1px solid #f1f5f9"
                                }}>
                                  {record.evidence}
                                </div>
                              </div>
                            )}

                            {record.aiResponse && (
                              <div>
                                <h4 style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  AI 解析
                                </h4>
                                <div style={{ 
                                  fontSize: 14, 
                                  color: "#334155", 
                                  lineHeight: 1.6,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  padding: "14px",
                                  backgroundColor: "#eff6ff",
                                  borderRadius: 8,
                                  border: "1px solid #dbeafe",
                                  borderLeft: "3px solid #3b82f6"
                                }}>
                                  {record.aiResponse}
                                </div>
                              </div>
                            )}

                            {(record.myQuestion || editingStates.get(record.id)?.field === "myQuestion") && (
                              <div>
                                <h4 style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  My Note
                                </h4>
                                {editingStates.get(record.id)?.field === "myQuestion" ? (
                                  <div>
                                    <textarea
                                      value={editingStates.get(record.id)?.value || ""}
                                      onChange={(e) => {
                                        setEditingStates(prev => {
                                          const newMap = new Map(prev)
                                          newMap.set(record.id, { field: "myQuestion", value: e.target.value })
                                          return newMap
                                        })
                                      }}
                                      style={{
                                        width: "100%",
                                        minHeight: 100,
                                        padding: 14,
                                        fontSize: 14,
                                        border: "2px solid #fbbf24",
                                        borderRadius: 8,
                                        backgroundColor: "#fefce8",
                                        resize: "vertical",
                                        boxSizing: "border-box",
                                        lineHeight: 1.6,
                                        color: "#78350f"
                                      }}
                                    />
                                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          saveEdit(record.id)
                                        }}
                                        style={{
                                          padding: "8px 16px",
                                          backgroundColor: "#f59e0b",
                                          color: "white",
                                          border: "none",
                                          borderRadius: 6,
                                          fontSize: 12,
                                          cursor: "pointer",
                                          fontWeight: 600,
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        💾 保存
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          cancelEdit(record.id)
                                        }}
                                        style={{
                                          padding: "8px 16px",
                                          backgroundColor: "#f3f4f6",
                                          color: "#6b7280",
                                          border: "1px solid #e5e7eb",
                                          borderRadius: 6,
                                          fontSize: 12,
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        取消
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ 
                                    fontSize: 14, 
                                    color: "#78350f", 
                                    lineHeight: 1.6,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    padding: "14px",
                                    backgroundColor: "#fefce8",
                                    borderRadius: 8,
                                    border: "1px solid #fde68a"
                                  }}>
                                    {record.myQuestion}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeNav === "corpus" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                📖 语料中心
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                统一管理生词与同义替换
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
              {corpusTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCorpusTab(tab.id)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: activeCorpusTab === tab.id ? "#eff6ff" : "transparent",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: activeCorpusTab === tab.id ? 600 : 500,
                    color: activeCorpusTab === tab.id ? "#2563eb" : "#64748b",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  {tab.label}
                  {tab.id === "vocab" && ` (${vocabList.length})`}
                  {tab.id === "synonym" && ` (${synonymList.length})`}
                </button>
              ))}
            </div>

            {activeCorpusTab === "vocab" && (
              <div>
                {vocabList.length === 0 ? (
                  <div style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 12,
                    padding: 48,
                    textAlign: "center",
                    border: "1px solid #f1f5f9"
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
                    <p style={{ fontSize: 16, color: "#64748b", fontWeight: 500 }}>暂无生词</p>
                    <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 8 }}>在侧边栏选择「词汇」错因标签时会自动记录</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {vocabList.map((vocab) => (
                      <div key={vocab.id} style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 12,
                        padding: 20,
                        border: "1px solid #f1f5f9"
                      }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                          {vocab.word} <span style={{ fontSize: 16, fontWeight: 500, color: "#059669" }}>{vocab.meaning}</span>
                        </div>
                        {vocab.context && (
                          <div style={{ marginTop: 12, fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>
                            {vocab.context}
                          </div>
                        )}
                        {vocab.index && (
                          <div style={{ marginTop: 8, display: "inline-block", fontSize: 11, padding: "4px 8px", backgroundColor: "#f1f5f9", color: "#64748b", borderRadius: 6, fontWeight: 500 }}>
                            {vocab.index}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeCorpusTab === "synonym" && (
              <div>
                {synonymList.length === 0 ? (
                  <div style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 12,
                    padding: 48,
                    textAlign: "center",
                    border: "1px solid #f1f5f9"
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
                    <p style={{ fontSize: 16, color: "#64748b", fontWeight: 500 }}>暂无同义替换</p>
                    <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 8 }}>在侧边栏选择「同义替换」错因标签时会自动记录</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {synonymList.map((syn) => (
                      <div key={syn.id} style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 12,
                        padding: 20,
                        border: "1px solid #f1f5f9"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                              {syn.originalWord}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, backgroundColor: "#f1f5f9", borderRadius: 8 }}>
                            <span style={{ fontSize: 16, color: "#64748b" }}>→</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: "#2563eb" }}>
                              {syn.questionWord}
                            </div>
                          </div>
                          {syn.index && (
                            <span style={{
                              fontSize: 11,
                              padding: "4px 8px",
                              backgroundColor: "#eff6ff",
                              color: "#2563eb",
                              borderRadius: 6,
                              fontWeight: 500,
                              cursor: "pointer"
                            }}>
                              {syn.index}
                            </span>
                          )}
                        </div>
                        {syn.context && (
                          <div style={{ marginTop: 12, fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>
                            {syn.context}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeNav === "settings" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>
              ⚙️ 设置
            </h2>
            <div style={{ 
              backgroundColor: "#ffffff", 
              borderRadius: 12, 
              padding: 24, 
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              border: "1px solid #f1f5f9"
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 16 }}>
                📊 数据管理
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 16, backgroundColor: "#fafafa", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#334155", margin: 0 }}>
                        当前错题数量
                      </p>
                      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                        存储在浏览器本地
                      </p>
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>
                      {historyList.length}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    if (confirm("确定要清空所有错题记录吗？此操作不可恢复！")) {
                      chrome.storage.local.set({ historyList: [] })
                      setHistoryList([])
                      setToastMessage("已清空所有记录")
                      setShowToast(true)
                      setTimeout(() => setShowToast(false), 1500)
                    }
                  }}
                  style={{
                    padding: "12px 20px",
                    backgroundColor: "#fee2e2",
                    border: "1px solid #fca5a5",
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#dc2626",
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "all 0.15s"
                  }}
                >
                  🗑️ 清空所有数据
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {showToast && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "#10B981",
          color: "white",
          padding: "14px 24px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          boxShadow: "0 4px 16px rgba(16, 185, 129, 0.25)",
          zIndex: 1000,
          animation: "fadeIn 0.15s ease"
        }}>
          ✅ {toastMessage}
        </div>
      )}
    </div>
  )
}

export default Dashboard