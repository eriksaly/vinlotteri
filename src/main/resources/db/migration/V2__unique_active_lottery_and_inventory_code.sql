-- At most one lottery is open or drawing. LotteryService.createLottery checks this first, but two requests
-- at the same moment can both pass the check. Hidden from jOOQ's code generator, which can't read an index
-- on an expression and doesn't need it.
-- [jooq ignore start]
create unique index lotteries_one_active_idx on lotteries ((true)) where status <> 'CLOSED';
-- [jooq ignore stop]

-- One inventory item per Vinmonopolet product: adding a product that's already in the inventory adds to
-- its quantity (InventoryItemRepository.insertOrAddQuantity)
alter table inventory_items add constraint inventory_items_vinmonopolet_code_key unique (vinmonopolet_code);
