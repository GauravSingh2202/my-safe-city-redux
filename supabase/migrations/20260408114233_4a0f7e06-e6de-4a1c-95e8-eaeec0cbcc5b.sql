-- Drop old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own reports or admin views all" ON public.crime_reports;

-- Create new policy: all authenticated users can view all reports
CREATE POLICY "All authenticated users can view reports"
ON public.crime_reports
FOR SELECT
TO authenticated
USING (true);