# Resonant Field integration

Relay now uses Resonant Field as its shared knowledge layer.

## Live integration

Relay notes, todos, and Relay-native calendar events sync into Field through database triggers.

The `/field` workspace reads the authenticated user's Field nodes and can preview:

- note blocks
- todo state and due dates
- calendar details
- private image/screenshot uploads via signed Storage URLs
- text/Markdown file contents
- generic file metadata while extraction is pending

## Storage

Private uploads use the `field-files` Supabase Storage bucket. Objects are namespaced by authenticated user ID and protected by Storage RLS.

## RAVIN

Field source permissions keep RAVIN access separate from normal user access. Relay notes, todos, calendar items, and Field uploads are configured for RAVIN retrieval; external AI access remains off by default.
