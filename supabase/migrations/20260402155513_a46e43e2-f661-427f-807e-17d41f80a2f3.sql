
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'citizen');

-- Profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'citizen',
  UNIQUE(user_id, role)
);

-- Crime reports
CREATE TABLE public.crime_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location_lat DOUBLE PRECISION NOT NULL DEFAULT 30.3165,
  location_lng DOUBLE PRECISION NOT NULL DEFAULT 78.0322,
  location_address TEXT,
  crime_location_lat DOUBLE PRECISION,
  crime_location_lng DOUBLE PRECISION,
  crime_location_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  severity TEXT NOT NULL DEFAULT 'medium',
  media_names TEXT[],
  status_updates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SOS Alerts
CREATE TABLE public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  location_address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emergency Services
CREATE TABLE public.emergency_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'police',
  location_lat DOUBLE PRECISION NOT NULL DEFAULT 30.3165,
  location_lng DOUBLE PRECISION NOT NULL DEFAULT 78.0322,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  distance DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crime_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_services ENABLE ROW LEVEL SECURITY;

-- Helper function: check admin role (SECURITY DEFINER to avoid RLS recursion)
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

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citizen');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crime_reports_updated_at BEFORE UPDATE ON public.crime_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =================== RLS POLICIES ===================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- USER_ROLES
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- CRIME_REPORTS
CREATE POLICY "Users can view own reports or admin views all" ON public.crime_reports FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create reports" ON public.crime_reports FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reports or admin updates all" ON public.crime_reports FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own reports or admin deletes all" ON public.crime_reports FOR DELETE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- SOS_ALERTS
CREATE POLICY "Users can view own alerts or admin views all" ON public.sos_alerts FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create alerts" ON public.sos_alerts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own alerts or admin updates all" ON public.sos_alerts FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- EMERGENCY_SERVICES (public read, admin write)
CREATE POLICY "Anyone can view emergency services" ON public.emergency_services FOR SELECT USING (true);
CREATE POLICY "Admins can add services" ON public.emergency_services FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update services" ON public.emergency_services FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete services" ON public.emergency_services FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_crime_reports_user_id ON public.crime_reports(user_id);
CREATE INDEX idx_crime_reports_status ON public.crime_reports(status);
CREATE INDEX idx_sos_alerts_user_id ON public.sos_alerts(user_id);
CREATE INDEX idx_sos_alerts_status ON public.sos_alerts(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
