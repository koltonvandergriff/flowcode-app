-- ============================================================================
-- Demo seed: 400 memories with overlapping tag clusters so the cosmos
-- visualizer has rich connections to draw.
--
-- Replace USER_ID below with your auth user UUID, then run in Supabase
-- SQL Editor. Safe to re-run — uses ON CONFLICT DO NOTHING.
--
-- To wipe demo memories afterwards:
--   DELETE FROM memories WHERE id LIKE 'demo-%' AND user_id = '<your uuid>';
-- ============================================================================

DO $$
DECLARE
  target_user uuid := '31ca81b9-8c7c-4ddd-b3f0-357f09acfb30';

  -- 8 thematic clusters; each memory pulls 2 tags from one cluster and
  -- 1 "bridge" tag from a neighbouring cluster, producing a connected graph.
  clusters text[][] := ARRAY[
    ARRAY['web','frontend','react','typescript','vite','tailwind'],
    ARRAY['backend','api','postgres','rest','graphql','redis'],
    ARRAY['auth','jwt','oauth','rls','session','sso'],
    ARRAY['devops','docker','kubernetes','ci','deploy','terraform'],
    ARRAY['mobile','ios','android','swift','expo','react-native'],
    ARRAY['ml','python','training','dataset','llm','embeddings'],
    ARRAY['design','ux','figma','prototype','animation','accessibility'],
    ARRAY['ops','monitoring','logging','alerting','sla','postmortem']
  ];

  types text[] := ARRAY['fact','decision','context','reference','note'];

  type_titles jsonb := jsonb_build_object(
    'fact',      ARRAY['Use','Prefer','Always','Never','Default to','Pin','Stick with'],
    'decision',  ARRAY['Chose','Picked','Replaced','Migrated to','Adopted','Switched to'],
    'context',   ARRAY['Migrating','Refactoring','Rolling out','Sunsetting','Investigating','Tracking'],
    'reference', ARRAY['Docs:','Spec:','RFC:','Diagram:','Runbook:','Dashboard:'],
    'note',      ARRAY['Idea:','TODO:','Watchlist:','Question:','Reminder:','Followup:']
  );

  topic_words text[] := ARRAY[
    'caching layer','rate limiter','session store','image pipeline','cron worker',
    'webhook router','queue consumer','background indexer','search ranker',
    'feature flagging','onboarding flow','billing engine','permission model',
    'audit log','telemetry exporter','schema migration','login form','search box',
    'navigation bar','toast component','retry policy','deadletter queue',
    'state machine','cache invalidation','token refresh','password reset',
    'profile editor','notification panel','sync queue','analytics pipeline'
  ];

  rationales text[] := ARRAY[
    'cleaner separation of concerns and easier to reason about under pressure',
    'better performance characteristics under realistic load patterns',
    'tooling already supports it natively so we save on integration cost',
    'team has prior experience and onboarding is faster',
    'matches the rest of the stack so context-switching cost is minimal',
    'simpler mental model than the alternatives we evaluated',
    'removes a known class of failure modes seen in last quarter''s incidents',
    'gives us a clear migration path off the legacy implementation'
  ];

  i int;
  cluster_idx int;
  bridge_idx int;
  cluster_tags text[];
  bridge_tags text[];
  picked_tags text[];
  type_choice text;
  prefix_arr text[];
  prefix text;
  topic text;
  rationale text;
  ts bigint;
  rand_seed int;
BEGIN
  FOR i IN 1..400 LOOP
    cluster_idx := 1 + (i % array_length(clusters, 1));
    bridge_idx := 1 + ((i + 3) % array_length(clusters, 1));
    cluster_tags := clusters[cluster_idx];
    bridge_tags := clusters[bridge_idx];

    picked_tags := ARRAY[
      cluster_tags[1 + (i % array_length(cluster_tags, 1))],
      cluster_tags[1 + ((i * 7) % array_length(cluster_tags, 1))],
      bridge_tags[1 + ((i * 11) % array_length(bridge_tags, 1))]
    ];
    -- de-dup tags
    picked_tags := ARRAY(SELECT DISTINCT unnest(picked_tags));

    type_choice := types[1 + (i % array_length(types, 1))];
    prefix_arr := ARRAY(SELECT jsonb_array_elements_text(type_titles -> type_choice));
    prefix := prefix_arr[1 + ((i * 13) % array_length(prefix_arr, 1))];
    topic := topic_words[1 + ((i * 17) % array_length(topic_words, 1))];
    rationale := rationales[1 + ((i * 19) % array_length(rationales, 1))];

    -- Spread timestamps across the last 90 days so recency-based glow works.
    ts := (extract(epoch from now()) * 1000)::bigint - (i::bigint * 1000 * 60 * 60 * 5);
    rand_seed := i;

    INSERT INTO memories (id, user_id, title, content, type, tags, created_at, updated_at)
    VALUES (
      'demo-' || lpad(i::text, 4, '0'),
      target_user,
      prefix || ' ' || topic,
      'Notes on **' || topic || '** — ' || rationale || E'.\n\nTags: ' || array_to_string(picked_tags, ', ') || '.',
      type_choice,
      to_jsonb(picked_tags),
      ts,
      ts
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Seeded 400 demo memories for user %', target_user;
END $$;
