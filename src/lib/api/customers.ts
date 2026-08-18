export interface CustomerSearchResult {
  id: string;
  name: string;
  mobile: string;
  address: string;
  village?: string | null;
  district: string;
  pincode: string;
  status?: string;
  interestedProduct?: string | null;
  location?: { latitude: number; longitude: number } | null;
}

export interface NewCustomerInput {
  name: string;
  mobile: string;
  address: string;
  village?: string;
  district: string;
  pincode: string;
}

export async function searchCustomers(query: string): Promise<CustomerSearchResult[]> {
  const res = await fetch(`/api/employee/customers?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search customers");
  return res.json();
}

export interface CreateCustomerResult {
  customer?: CustomerSearchResult;
  ownedByCurrentAgent?: boolean;
  [key: string]: unknown;
}

export async function createCustomer(input: NewCustomerInput): Promise<CustomerSearchResult> {
  const res = await fetch("/api/employee/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data: CreateCustomerResult = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 409) {
    throw new Error((data as { error?: string }).error ?? "Failed to save customer");
  }
  // A 409 for a customer already owned by someone else isn't safe to silently
  // reuse — this agent won't be able to place orders for them, so surface it.
  if (res.status === 409 && !data.ownedByCurrentAgent) {
    throw new Error((data as { error?: string }).error ?? "This customer is already registered by another agent");
  }
  return (data.customer ?? (data as unknown as CustomerSearchResult));
}
