"use client";

import { useState } from "react";
import type { Seller, MenuItem } from "@/lib/types";
import SellerCard from "./SellerCard";
import OrderSheet from "./OrderSheet";

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
      // Select and immediately open the drawer for faster flow
      setSelectedSellerId(sellerId);
      setDrawerOpen(true);
    }
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
  }

  return (
    <>
      <div className="space-y-4" role="list" aria-label="Available sellers">
        {sellers.map((seller) => (
          <div key={seller.id} role="listitem">
            <SellerCard
              seller={seller}
              isSelected={selectedSellerId === seller.id}
              onSelect={() => handleSelect(seller.id)}
            />
          </div>
        ))}
      </div>

      {drawerOpen && selectedSeller && (
        <OrderSheet
          seller={selectedSeller}
          restaurantName={restaurantName}
          menuItems={menuItems}
          onClose={handleCloseDrawer}
        />
      )}
    </>
  );
}
