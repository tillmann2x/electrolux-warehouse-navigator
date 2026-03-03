
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'operador');

-- User roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'operador',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Audit log table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and supervisors can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Warehouse config table (for Address Engine)
CREATE TABLE public.warehouse_street_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street_number INT NOT NULL UNIQUE,
    modules INT NOT NULL DEFAULT 3,
    levels TEXT[] NOT NULL DEFAULT ARRAY['A', 'B', 'C', 'D'],
    positions_per_level INT NOT NULL DEFAULT 4,
    positions_ground INT NOT NULL DEFAULT 6,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.warehouse_street_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view warehouse config"
ON public.warehouse_street_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can modify warehouse config"
ON public.warehouse_street_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default street configs
INSERT INTO public.warehouse_street_config (street_number, modules, levels, positions_per_level, positions_ground) VALUES
(1, 4, ARRAY['A','B','C','D','E','F'], 4, 6),
(2, 4, ARRAY['A','B','C','D','E','F'], 4, 6),
(3, 4, ARRAY['A','B','C','D','E'], 4, 6),
(4, 3, ARRAY['A','B','C','D','E'], 4, 6),
(5, 3, ARRAY['A','B','C','D','E','F'], 4, 6),
(6, 3, ARRAY['A','B','C','D'], 4, 6);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_warehouse_config_updated_at
BEFORE UPDATE ON public.warehouse_street_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for audit logs performance
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
