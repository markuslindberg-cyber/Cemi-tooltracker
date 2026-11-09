import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { emptySession, buildUpdates, validateSession } from '@/lib/massMove';

const toSession = (r) => ({ lists: r.lists || [], unplaced: r.unplaced || [], unknown: r.unknown || [] });

// Loads the user's in-progress mass move and autosaves every change
export function useMassMoveSession() {
  const qc = useQueryClient();
  const [session, setSessionState] = useState(emptySession());
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const recordRef = useRef(null);
  const meRef = useRef(null);
  const dirty = useRef(false);
  const timer = useRef(null);
  const chain = useRef(Promise.resolve());

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      meRef.current = me;
      const rows = await base44.entities.MassMoveSession.filter({ status: 'pågående', started_by_email: me.email }, '-updated_date', 1);
      if (rows[0]) { recordRef.current = rows[0]; setSessionState(toSession(rows[0])); }
    })().finally(() => setLoading(false));
  }, []);

  const persist = (s) => {
    chain.current = chain.current.then(async () => {
      if (recordRef.current) {
        await base44.entities.MassMoveSession.update(recordRef.current.id, s);
      } else {
        const me = meRef.current;
        recordRef.current = await base44.entities.MassMoveSession.create({
          ...s, status: 'pågående', started_by_email: me?.email, started_by_name: me?.full_name || me?.email,
        });
      }
    });
    return chain.current;
  };

  useEffect(() => {
    if (!dirty.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(session), 700);
    return () => clearTimeout(timer.current);
  }, [session]);

  const setSession = (u) => { dirty.current = true; setSessionState(u); };

  const confirm = async () => {
    const errors = validateSession(session);
    if (errors.length) throw new Error(errors[0]);
    setConfirming(true);
    try {
      clearTimeout(timer.current);
      await persist(session);
      const updates = buildUpdates(session);
      for (let i = 0; i < updates.length; i += 8) {
        await Promise.all(updates.slice(i, i + 8).map(u => base44.entities[u.entity].update(u.id, u.data)));
      }
      await base44.entities.MassMoveSession.update(recordRef.current.id, { status: 'bekräftad', confirmed_at: new Date().toISOString() });
      recordRef.current = null;
      dirty.current = false;
      setSessionState(emptySession());
      qc.invalidateQueries();
      const sold = session.lists.filter(l => l.kind === 'sale').reduce((n, l) => n + l.items.length, 0);
      return { moved: updates.length - sold, sold };
    } finally {
      setConfirming(false);
    }
  };

  return { session, setSession, loading, confirming, confirm };
}