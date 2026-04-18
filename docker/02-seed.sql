-- ============================================================
-- Obra Fácil — Seed Data
-- per spec_ui.md: data matches exactly what Stitch prototypes display
-- ============================================================

-- ============================================================
-- PROFILES (demo users)
-- ============================================================

-- Demo client: Carlos Alberto (persona from prd.md)
insert into profiles (id, clerk_id, full_name, avatar_url, phone, role) values
(
  '00000000-0000-0000-0000-000000000001',
  'demo_client_001',
  'Carlos Alberto',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
  '+55 11 99999-0001',
  'client'
);

-- Demo professional profiles
insert into profiles (id, clerk_id, full_name, avatar_url, phone, role) values
(
  '00000000-0000-0000-0000-000000000002',
  'demo_professional_001',
  'Ricardo Silva',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=200',
  '+55 11 99999-0002',
  'professional'
),
(
  '00000000-0000-0000-0000-000000000003',
  'demo_professional_002',
  'José da Silva',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  '+55 11 99999-0003',
  'professional'
),
(
  '00000000-0000-0000-0000-000000000004',
  'demo_professional_003',
  'Ana Rodrigues',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200',
  '+55 11 99999-0004',
  'professional'
);

-- Demo store profiles
insert into profiles (id, clerk_id, full_name, avatar_url, phone, role) values
(
  '00000000-0000-0000-0000-000000000005',
  'demo_store_001',
  'Construção Sul',
  null,
  '+55 11 3333-0001',
  'store'
),
(
  '00000000-0000-0000-0000-000000000006',
  'demo_store_002',
  'Hidráulica Centro',
  null,
  '+55 11 3333-0002',
  'store'
),
(
  '00000000-0000-0000-0000-000000000007',
  'demo_store_003',
  'Materiais Avenida',
  null,
  '+55 11 3333-0003',
  'store'
);

-- Additional reviewer profiles
insert into profiles (id, clerk_id, full_name, avatar_url, phone, role) values
(
  '00000000-0000-0000-0000-000000000008',
  'demo_reviewer_001',
  'Maria Regina',
  null,
  null,
  'client'
),
(
  '00000000-0000-0000-0000-000000000009',
  'demo_reviewer_002',
  'Carlos Santos',
  null,
  null,
  'client'
),
(
  '00000000-0000-0000-0000-000000000010',
  'demo_reviewer_003',
  'Ana Paula Lima',
  null,
  null,
  'client'
);

-- Additional demo client for multi-user isolation testing
insert into profiles (id, clerk_id, full_name, avatar_url, phone, role) values
(
  '00000000-0000-0000-0000-000000000011',
  'demo_client_002',
  'Joana Mendes',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
  '+55 11 99999-0011',
  'client'
);

-- ============================================================
-- PROFESSIONALS
-- per Stitch prototypes: Ricardo Silva (4.9/128), José da Silva (4.9/142)
-- ============================================================

insert into professionals (id, profile_id, specialty, bio, rating_avg, jobs_completed, is_verified, latitude, longitude) values
(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'Eletricista Residencial',
  'Trabalhando há 12 anos em instalações elétricas residenciais e comerciais. Especialista em laudos e inspeções.',
  4.9,
  128,
  true,
  -23.5505,
  -46.6333
),
(
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  'Encanador Hidráulico',
  'Encanador com 15 anos de experiência levando confiança e qualidade para cada projeto. Especialista em vazamentos e reformas hidráulicas.',
  4.9,
  142,
  true,
  -23.5600,
  -46.6400
),
(
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  'Pintora Residencial',
  'Especialista em pinturas residenciais e comerciais. Técnica de acabamento fino e texturas decorativas.',
  4.7,
  89,
  true,
  -23.5480,
  -46.6200
);

-- ============================================================
-- SERVICES
-- per spec_ui.md INT-01: "Grid de Ícones de Serviços Rápidos"
-- ============================================================

insert into services (id, name, icon_name, description, sort_order) values
('20000000-0000-0000-0000-000000000001', 'Reparos elétricos',        'bolt',           'Instalações, reparos e laudos elétricos',          1),
('20000000-0000-0000-0000-000000000002', 'Instalações Hidráulicas',  'water_drop',     'Encanamento, vazamentos e instalações hidráulicas', 2),
('20000000-0000-0000-0000-000000000003', 'Pinturas',                 'format_paint',   'Pintura interna, externa e texturas',               3),
('20000000-0000-0000-0000-000000000004', 'Diaristas',                'cleaning_services', 'Limpeza doméstica e comercial',                  4),
('20000000-0000-0000-0000-000000000005', 'Pedreiro',                 'construction',   'Construção, reformas e acabamentos',               5),
('20000000-0000-0000-0000-000000000006', 'Marceneiro',               'chair',          'Móveis planejados e carpintaria',                  6);

-- ============================================================
-- REVIEWS
-- per Stitch prototypes: exact names and content from perfil_do_profissional
-- ============================================================

-- Reviews for José da Silva (Encanador)
insert into reviews (id, professional_id, reviewer_id, rating, comment, created_at) values
(
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000008',
  5,
  'O Sr. José foi muito atencioso e resolveu um vazamento que outros três encanadores não conseguiram. Recomendo muito!',
  now() - interval '2 days'
),
(
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000009',
  5,
  'Profissional pontual e deixou tudo limpo após o serviço. Preço justo pela qualidade do trabalho.',
  now() - interval '7 days'
),
(
  '30000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000010',
  5,
  'Excelente serviço! Resolveu o problema de pressão na nossa cozinha em menos de 1 hora.',
  now() - interval '14 days'
);

-- Reviews for Ricardo Silva (Eletricista)
insert into reviews (id, professional_id, reviewer_id, rating, comment, created_at) values
(
  '30000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000008',
  5,
  'Ricardo resolveu o curto-circuito rapidamente e ainda identificou outros problemas elétricos. Muito competente!',
  now() - interval '3 days'
),
(
  '30000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000009',
  5,
  'Serviço impecável. Instalou o painel elétrico com toda segurança e dentro do prazo.',
  now() - interval '10 days'
);

-- ============================================================
-- STORES
-- per Stitch prototypes (cotacao): exact store names and prices
-- ============================================================

insert into stores (id, profile_id, name, address, lat, lng, delivery_time) values
(
  '40000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000005',
  'Loja Construção Sul',
  'Av. Paulista, 1000 - Bela Vista, São Paulo',
  -23.5618,
  -46.6561,
  'Entrega em até 2 horas'
),
(
  '40000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000006',
  'Hidráulica Centro',
  'Rua Augusta, 500 - Consolação, São Paulo',
  -23.5540,
  -46.6500,
  'Retirada em loja imediata'
),
(
  '40000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000007',
  'Materiais Avenida',
  'Av. Rebouças, 1500 - Pinheiros, São Paulo',
  -23.5660,
  -46.6640,
  'Entrega agendada (Grátis)'
);

-- ============================================================
-- CONVERSATIONS + MESSAGES
-- per Stitch prototypes (chat): exact content from chat_de_servico
-- ============================================================

insert into conversations (id, client_id, professional_id, created_at, last_message_at) values
(
  '50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  now() - interval '2 hours',
  now() - interval '1 hour'
);

insert into messages (id, conversation_id, sender_id, content, type, created_at) values
(
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'Olá! Sou o José, seu especialista Obra Fácil. Como posso ajudar no seu projeto hoje?',
  'text',
  now() - interval '2 hours'
),
(
  '60000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Oi José, tudo bem? Preciso de uma lista dos materiais para o acabamento do banheiro social.',
  'text',
  now() - interval '1 hour 45 minutes'
),
(
  '60000000-0000-0000-0000-000000000003',
  '50000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'Já estou separando os itens aqui. Você prefere louças brancas ou coloridas?',
  'text',
  now() - interval '1 hour 30 minutes'
);

-- ============================================================
-- MATERIAL LISTS + ITEMS
-- per Stitch prototypes (cotacao): Tubo PVC 25mm, Cola, Torneira Inox
-- ============================================================

insert into material_lists (id, conversation_id, professional_id, status) values
(
  '70000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'quoted'
);

insert into material_items (id, material_list_id, name, quantity, unit, brand, image_url) values
(
  '80000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'Tubo PVC 25mm',
  10,
  'm',
  'Tigre',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80'
),
(
  '80000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000001',
  'Cola para Tubo',
  1,
  'frasco 75g',
  'Extra Forte',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=80'
),
(
  '80000000-0000-0000-0000-000000000003',
  '70000000-0000-0000-0000-000000000001',
  'Torneira Inox',
  1,
  'un',
  'Docol',
  'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=80'
);

-- ============================================================
-- STORE OFFERS
-- per Stitch prototypes: R$218.30 (Construção Sul best), R$243.50, R$263.30
-- ============================================================

insert into store_offers (id, store_id, material_list_id, total_price, delivery_info, is_best_price) values
(
  '90000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  218.30,
  'Entrega em até 2 horas',
  true
),
(
  '90000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000001',
  243.50,
  'Retirada em loja imediata',
  false
),
(
  '90000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000003',
  '70000000-0000-0000-0000-000000000001',
  263.30,
  'Entrega agendada (Grátis)',
  false
);

-- ============================================================
-- ORDERS
-- per Stitch prototypes (meus_pedidos): #88421 A Caminho, #88390 Entregue
-- ============================================================

insert into orders (id, client_id, store_id, material_list_id, status, total_amount, order_number, created_at) values
(
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'shipped',
  450.90,
  '88421',
  now() - interval '2 days'
),
(
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000003',
  null,
  'delivered',
  1200.00,
  '88390',
  now() - interval '4 days'
),
-- Orders for Joana Mendes (demo_client_002) — for isolation testing
(
  'a0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000011',
  '40000000-0000-0000-0000-000000000002',
  null,
  'delivered',
  320.50,
  '90102',
  now() - interval '1 day'
),
(
  'a0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000011',
  '40000000-0000-0000-0000-000000000001',
  null,
  'pending',
  89.90,
  '90155',
  now() - interval '3 hours'
);

-- ============================================================
-- WORKS (OBRAS)
-- per Stitch prototypes: Reforma Banheiro Social 65%, Pintura Fachada Agendado
-- ============================================================

insert into works (id, client_id, professional_id, title, status, progress_pct, next_step, photos, started_at) values
(
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Reforma Banheiro Social',
  'active',
  65,
  'Instalação de louças e metais',
  array[
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=200',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200',
    'https://images.unsplash.com/photo-1560440021-33f9b867899d?w=200'
  ],
  now() - interval '10 days'
),
(
  'b0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Pintura Fachada',
  'scheduled',
  0,
  'Início previsto para 15 de Outubro',
  array[]::text[],
  null
);
