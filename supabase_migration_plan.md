# Supabase Migration & Security Audit Plan (FOR NEXT SESSION)

The previous session was unable to execute this due to Supabase Management API technical issues and MCP authorization constraints.

## 1. Vector Storage Migration (pgvector)
Run this SQL in the Supabase Dashboard:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_base (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(384)
);

CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## 2. RLS Security Audit
Run this SQL to secure the tables:
```sql
ALTER TABLE box_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanji ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanji_mot ENABLE ROW LEVEL SECURITY;

-- Add policies (Simplified for pseudo-based auth)
CREATE POLICY "Public read kanji" ON kanji FOR SELECT USING (true);
CREATE POLICY "Public read kanji_mot" ON kanji_mot FOR SELECT USING (true);
CREATE POLICY "Public insert sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read/write progress" ON progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read/write box_progress" ON box_progress FOR ALL USING (true) WITH CHECK (true);
```

## 3. Backend Update
Update `backend/api/chat.py` to use `SupabaseVectorStore` instead of `FAISS`.
Ensure `SUPABASE_SERVICE_ROLE_KEY` is added to `.env`.
