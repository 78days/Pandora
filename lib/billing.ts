// The slug of the single paid plan in Clerk Billing (Dashboard → Billing →
// Plans, User Plans tab). Everything billable — bots, chats, sandboxes —
// gates on it; anyone without an active subscription to it is on the free
// tier and gets blocked with a toast.
export const PAID_PLAN = "pro"
