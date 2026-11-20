import { Navigate, Outlet, useOutletContext } from 'react-router-dom';

/**
 * Stage 1 / stage 2 of the client portal: pages that only make sense once a quotation was awarded
 * are not reachable until the client has at least one project.
 */
export default function RequireProject() {
  const ctx = useOutletContext();
  if (ctx.projectCount === null || ctx.projectCount === undefined) return <div className="card">Loading...</div>;
  if (ctx.projectCount === 0) return <Navigate to="/client/requirements" replace />;
  return <Outlet context={ctx} />;
}

/** /client lands on the dashboard once there is a project, otherwise on My Requirements. */
export function ClientHome() {
  const ctx = useOutletContext();
  if (ctx.projectCount === null || ctx.projectCount === undefined) return <div className="card">Loading...</div>;
  return <Navigate to={ctx.projectCount > 0 ? '/client/dashboard' : '/client/requirements'} replace />;
}
