---
title: "refactor: Ajustar CSS do calendario de agendamento ao design Stitch"
type: refactor
status: active
date: 2026-04-08
---

# refactor: Ajustar CSS do calendario de agendamento ao design Stitch

## Overview

Ajuste de CSS no `react-day-picker` do `/agendar/[professionalId]` para alinhar ao mockup do designer. Nao reescrever nada — apenas corrigir os `classNames` do DayPicker e os estilos dos slots de horario.

## O que mudar

Manter `react-day-picker`. Ajustes pontuais:

| Elemento | Atual | Design (Stitch) |
|----------|-------|-----------------|
| Fonte do mes (caption) | `font-semibold text-slate-900` | Reduzir para `text-lg font-bold` (mais compacto) |
| Dia selecionado | Circulo com borda azul, texto preto (default DayPicker) | Background azul escuro (`#1E40AF` / trust), texto branco, rounded-full |
| Dia hoje | `font-bold text-trust` | Manter (ok) |
| Slots de horario | `grid-cols-3`, botoes pequenos sem label | `grid-cols-2`, cards maiores com hora em bold + label "Disponivel"/"Selecionado" |
| Slot selecionado | `bg-trust text-white` pequeno | `bg-[#1E40AF] text-white shadow-lg` com label "Selecionado" |
| Card info | Nao existe | Adicionar "Aviso Importante" (duracao 60min) com icone `info` |
| Badge data selecionada | Nao existe | Pill ao lado de "Horarios disponiveis" ex: "Ter, 15 Abr" |
| Titulo hero | "Escolha uma data" dentro do card | Mover para fora do card, h2 maior + subtitulo |
| Botao CTA | `bg-savings rounded-xl` | `bg-trust rounded-full` gradient-style |

## Arquivo a alterar

`apps/frontend/src/app/(app)/agendar/[professionalId]/AgendarClient.tsx`

## Acceptance Criteria

- [x] Dia selecionado = fundo azul escuro (#1E40AF), texto branco, circulo
- [x] Caption do mes com fonte menor/compacta
- [x] Slots em grid 2 colunas com label "Disponivel" / "Selecionado"
- [x] Badge com data selecionada ao lado do titulo "Horarios disponiveis"
- [x] Card "Aviso Importante" com duracao de 60min
- [x] Titulo "Escolha uma data" + subtitulo fora do card do calendario
- [x] Botao CTA rounded-full com estilo trust
- [x] Manter `react-day-picker` e `date-fns`
- [x] Nome do mes alinhado a esquerda, setas de navegacao alinhadas a direita (layout do Stitch)
