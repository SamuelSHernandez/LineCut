"use client";

import { useState } from "react";
import type { Seller, MenuItem } from "@/lib/types";
import SellerCard from "./SellerCard";
import OrderDrawer from "./OrderDrawer";

interface SellerListProps {
  sellers: Seller[];
  menuItems: MenuItem[];
  restaurantName: string;
}

export default function SellerList({
  sellers,
  menuItems,
  restaurantName,
}: SellerListProps) {
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId);

  function handleSelect(sellerId: string) {
    if (selectedSellerId === sellerId) {
      // Already selected -- open the drawer
      setDrawerOpen(true);
    } else {
      setSelectedSellerId(sellerId);
    }
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
  }

  return (
    <>
      <div className="space-y-4">
        {sellers.map((seller) => (
          <SellerCard
            key={seller.id}
            seller={seller}
            isSelected={selectedSellerId === seller.id}
            onSelect={() => handleSelect(seller.id)}
          />
        ))}
      </div>

      {drawerOpen && selectedSeller && (
        <OrderDrawer
          seller={selectedSeller}
          restaurantName={restaurantName}
          menuItems={menuItems}
          onClose={handleCloseDrawer}
        />
      )}
    </>
  );
}
