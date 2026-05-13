

## Plano: Sistema de Presença

### 1. Nova tabela `attendance`

```sql
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  time_slot_id uuid NOT NULL,
  attendance_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'present', 'absent'
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, time_slot_id, attendance_date)
);
```

RLS: professores podem tudo; alunos podem ver os próprios registros.

### 2. Nova página `AdminPresenca.tsx`

- Seletor de data (navegação por dia, como já existe em AdminHorarios)
- Para cada horário do dia, listar os alunos esperados (bookings regulares + fixed bookings ativos)
- Botões para marcar **Presente** / **Faltou** em cada aluno
- Badge visual: verde (presente), vermelho (faltou), cinza (pendente)

### 3. Seção de frequência por aluno

- Na mesma página ou como aba, exibir resumo de frequência de cada aluno:
  - Total de aulas, presenças, faltas, % de frequência
- Filtro por período (últimos 30 dias, ou range de datas)

### 4. Integração no Admin

- Adicionar rota `/admin/presenca` em `App.tsx`
- Adicionar item "Presença" no sidebar (`AdminLayout.tsx`) com ícone `ClipboardCheck` ou `CheckSquare`

### Detalhes técnicos

- A página busca bookings + fixed_bookings para o dia selecionado e cruza com registros de `attendance`
- Ao marcar presença, faz upsert na tabela `attendance` (INSERT ON CONFLICT UPDATE)
- Query de frequência: `SELECT student_id, COUNT(*) FILTER (WHERE status = 'present'), COUNT(*) FILTER (WHERE status = 'absent') FROM attendance GROUP BY student_id`

