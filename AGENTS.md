<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Use the existing TanStack routes, shared kit, Supabase client, and GSP theme tokens for athlete workflows — this keeps the new module consistent with the live app.
Keep athlete records independent of login accounts with optional profile linkage, and store CPF/RG separately from sports data — this supports offline registrations without exposing private documents to staff.
Use the atomic `salvar_cadastro_atleta` database function for personal, sports, and enrollment edits — this prevents partially saved athlete records.