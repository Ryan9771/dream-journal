import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AppHeader, Brand, CloudBackdrop } from "../components/layout/AppChrome";
import type { Dream, Insight } from "../domain/dreams";
import { normalizeDream } from "../domain/dreams";
import EntryModal from "../features/editor/EntryModal";
import InsightPanel from "../features/insights/InsightPanel";
import JournalPage from "../pages/JournalPage";
import LoginPage from "../pages/LoginPage";
import PatternsPage from "../pages/PatternsPage";
import { dreamApi } from "../services/api";
import { signInWithGoogle, signOutUser, watchAuth } from "../services/firebase";

const today = new Date();

export default function RecallApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [expandedDreamId, setExpandedDreamId] = useState<string | null>(null);
  const [insightDream, setInsightDream] = useState<Dream | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingDream, setEditingDream] = useState<Dream | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => watchAuth((nextUser) => {
    setUser(nextUser);
    setAuthReady(true);
  }), []);

  useEffect(() => {
    if (!user) return;
    dreamApi.list()
      .then(({ dreams: storedDreams }) => setDreams(storedDreams.map(normalizeDream)))
      .catch(console.error);
  }, [user]);

  if (!authReady) return <main className="auth-loading"><Brand /><span /></main>;
  if (!user) {
    return <LoginPage onLogin={signInWithGoogle} />;
  }

  const selectDate = (date: Date) => {
    setSelected(date);
    setQuery("");
    if (!isSameMonth(date, month)) setMonth(startOfMonth(date));
  };
  const openNewDream = () => {
    setEditingDream(null);
    setEntryOpen(true);
  };
  const editDream = (dream: Dream) => {
    setEditingDream(dream);
    setEntryOpen(true);
  };
  const editDreamFromPatterns = (dream: Dream) => {
    const dreamDate = new Date(`${dream.date}T12:00:00`);
    setSelected(dreamDate);
    setMonth(startOfMonth(dreamDate));
    setQuery("");
    setExpandedDreamId(dream.id);
    setEditingDream(dream);
    setEntryOpen(true);
    navigate("/journal");
  };

  return (
    <div className="app-shell">
      <CloudBackdrop />
      <AppHeader user={user} onSignOut={async () => {
        await signOutUser();
        setUser(null);
      }} />
      <Routes>
        <Route path="/journal" element={
          <JournalPage
            dreams={dreams}
            month={month}
            selected={selected}
            expandedDreamId={expandedDreamId}
            query={query}
            onMonth={(date) => {
              setMonth(startOfMonth(date));
              if (isSameDay(date, today)) setSelected(today);
            }}
            onSelectDate={selectDate}
            onQuery={setQuery}
            onExpand={setExpandedDreamId}
            onEdit={editDream}
            onInsight={setInsightDream}
            onNewDream={openNewDream}
          />
        } />
        <Route path="/patterns" element={
          <PatternsPage
            dreams={dreams}
            onJournal={() => {
              navigate("/journal");
              openNewDream();
            }}
            onEditDream={editDreamFromPatterns}
          />
        } />
        <Route path="*" element={<Navigate to="/journal" replace />} />
      </Routes>

      {entryOpen && (
        <EntryModal
          date={editingDream ? new Date(`${editingDream.date}T12:00:00`) : selected}
          initialDream={editingDream}
          onClose={() => {
            setEntryOpen(false);
            setEditingDream(null);
          }}
          onSave={async (dream) => {
            const response = editingDream
              ? await dreamApi.update(dream.id, { body: dream.body, contentHtml: dream.contentHtml, mood: dream.mood })
              : await dreamApi.create(dream);
            const saved = normalizeDream(response.dream);
            setDreams((currentDreams) => editingDream
              ? currentDreams.map((item) => item.id === saved.id ? saved : item)
              : [saved, ...currentDreams]);
            setExpandedDreamId(saved.id);
            setEntryOpen(false);
            setEditingDream(null);
          }}
        />
      )}

      {insightDream && (
        <div className="drawer-backdrop" onMouseDown={() => setInsightDream(null)}>
          <div onMouseDown={(event) => event.stopPropagation()}>
            <InsightPanel
              dream={insightDream}
              onClose={() => setInsightDream(null)}
              onGenerate={async () => {
                const response = await dreamApi.insight(insightDream.id);
                const updated = normalizeDream({
                  ...insightDream,
                  title: response.title || insightDream.title,
                  insight: response.insight as Insight,
                });
                setDreams((currentDreams) => currentDreams.map((item) => item.id === updated.id ? updated : item));
                setInsightDream(updated);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
