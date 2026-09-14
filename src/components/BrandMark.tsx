import { Shield } from "lucide-react";

export function BrandMark() {
  return (
    <div className="brand" aria-label="Computer Guardian">
      <span className="brand__mark" aria-hidden="true"><Shield size={18} strokeWidth={1.8} /></span>
      <span>Computer Guardian</span>
    </div>
  );
}
