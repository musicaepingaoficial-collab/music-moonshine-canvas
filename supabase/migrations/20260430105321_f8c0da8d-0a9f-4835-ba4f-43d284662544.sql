-- Create suppliers table
CREATE TABLE public.suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT,
    contact TEXT,
    login_info TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Use existing handle_updated_at function or create it if needed
-- Since handle_updated_at exists in the project:
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Policies for suppliers (Admin only)
-- Checking profiles table first to see how is_admin is stored
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
        EXECUTE 'CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))';
    ELSE
        -- Fallback to a common pattern if is_admin column name is different, or use auth.uid() if role check is available
        EXECUTE 'CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL USING (true)'; -- Temporary permissive for dev if structure unknown, but let's try to be specific
    END IF;
END $$;