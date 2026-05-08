import { ListingForm } from "@/components/listings/listing-form";

export default function NewListingPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Шинэ зар нэмэх</h1>
        <p className="text-sm text-gray-500 mt-1">Зар хадгалагдсаны дараа AI embedding автоматаар хийгдэнэ</p>
      </div>
      <ListingForm redirectOnSuccess="/dashboard/listings" />
    </div>
  );
}
