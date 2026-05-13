-- Create security definer function to check if user is professor
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_professor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = 'professor'::user_role
  )
$$;

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policies: users can view own profile, professors can view all
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Professors can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_professor(auth.uid()));