
2. Add files
Copy the following code into your project.
Code:
File: .env.local
```
VITE_SUPABASE_URL=https://nlfikqczpyqeodmqxwhx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TAIfCuJ2_57ycfvn53F6hQ_Q5XEfLjp
```

File: utils/supabase.ts
```
1import { createClient } from "@supabase/supabase-js";
2
3const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
4const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
5
6export const supabase = createClient(supabaseUrl, supabaseKey);
```
