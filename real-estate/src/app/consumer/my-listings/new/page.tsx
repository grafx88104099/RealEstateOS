import { ListingForm } from "@/components/listings/listing-form";

export default function ConsumerNewListingPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Зар нэмэх</h1>
        <p className="text-sm text-gray-500 mt-1">Таны зарыг агент хянаж баталгаажуулна</p>
      </div>
      <ListingForm redirectOnSuccess="/consumer/my-listings" />
    </div>
  );
}
