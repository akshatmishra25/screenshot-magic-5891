CREATE TABLE public.spotify_connections (
  user_id uuid PRIMARY KEY,
  spotify_user_id text NOT NULL,
  spotify_display_name text,
  encrypted_tokens text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.spotify_connections TO service_role;
ALTER TABLE public.spotify_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.spotify_oauth_states (
  state_hash text PRIMARY KEY,
  user_id uuid NOT NULL,
  code_verifier text NOT NULL,
  redirect_uri text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.spotify_oauth_states TO service_role;
ALTER TABLE public.spotify_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE INDEX spotify_oauth_states_expires_at_idx ON public.spotify_oauth_states (expires_at);