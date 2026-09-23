"use client";

import { use } from "react";
import { AdminProductForm } from "@/components/admin/AdminProductForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminProductEditPage({ params }: PageProps) {
  const { id } = use(params);
  return <AdminProductForm mode="edit" productId={id} />;
}
