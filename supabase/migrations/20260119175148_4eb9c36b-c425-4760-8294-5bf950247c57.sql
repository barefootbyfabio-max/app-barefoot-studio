-- Add approval_status to profiles
ALTER TABLE public.profiles 
ADD COLUMN approval_status text NOT NULL DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Update existing profiles to 'approved' (don't block current users)
UPDATE public.profiles SET approval_status = 'approved';

-- Add approval_status to fixed_bookings
ALTER TABLE public.fixed_bookings 
ADD COLUMN approval_status text NOT NULL DEFAULT 'pending'
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Approve existing fixed bookings
UPDATE public.fixed_bookings SET approval_status = 'approved';

-- Update handle_new_user function to set approval_status as pending by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, phone, city, cpf, approval_status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'aluno'),
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'city',
        NEW.raw_user_meta_data->>'cpf',
        'pending'
    );
    RETURN NEW;
END;
$function$;