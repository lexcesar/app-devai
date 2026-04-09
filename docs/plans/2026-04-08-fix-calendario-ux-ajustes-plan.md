---
title: "fix: Ajustes UX do calendario de agendamento"
type: fix
status: active
date: 2026-04-08
---

# fix: Ajustes UX do calendario de agendamento

4 ajustes visuais e de usabilidade no calendario de agendamento de visitas.

## Arquivo

`apps/frontend/src/app/(app)/agendar/[professionalId]/AgendarClient.tsx`

## Acceptance Criteria

- [x] 1. Calendario centralizado e proporcional dentro do card (grid nao vaza para fora das setas de navegacao)
- [x] 2. Semana comeca na segunda-feira (SEG TER QUA QUI SEX SAB DOM) — usar `weekStartsOn: 1` no DayPicker
- [x] 3. Ao selecionar um dia, scroll automatico ate a secao "Horarios disponiveis" — usar `useRef` + `scrollIntoView`
- [x] 4. Ao selecionar um horario, foco automatico no campo de endereco — usar `useRef` + `focus()`

## Implementacao

### Ajuste 1: Calendario proporcional
No `classNames` do DayPicker, ajustar o `day_button` para tamanho menor (`w-9 h-9` em vez de `w-10 h-10`) e o padding do card. Garantir que o grid de 7 colunas caiba dentro do container sem overflow.

### Ajuste 2: Semana comeca na segunda
Adicionar prop `weekStartsOn={1}` no componente `DayPicker`. O `react-day-picker` v9 suporta esta prop nativamente.

### Ajuste 3: Scroll ao selecionar dia
Criar `useRef` para a secao de horarios. No `onSelect` do DayPicker, apos setar a data, chamar `ref.current?.scrollIntoView({ behavior: 'smooth' })`.

### Ajuste 4: Foco no campo de endereco ao selecionar horario
Criar `useRef` para o input de endereco. No `onClick` do botao de horario, apos setar o time, chamar `ref.current?.focus()` com um pequeno delay para aguardar o render.
