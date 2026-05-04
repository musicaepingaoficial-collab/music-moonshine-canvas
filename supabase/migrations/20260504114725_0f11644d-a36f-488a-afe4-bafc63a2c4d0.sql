-- Create tutorials table
CREATE TABLE public.tutoriais (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    video_url TEXT,
    conteudo TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutoriais ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tutoriais are viewable by everyone" 
ON public.tutoriais 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage tutoriais" 
ON public.tutoriais 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Create function to update timestamps if not exists (usually it already exists in most projects)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_tutoriais_updated_at ON public.tutoriais;
CREATE TRIGGER update_tutoriais_updated_at
BEFORE UPDATE ON public.tutoriais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();