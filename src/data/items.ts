import type { Item } from "../types/domain";
import { ITEM_ARMORItems } from "./items/byType/ITEM_ARMOR";
import { ITEM_BELTItems } from "./items/byType/ITEM_BELT";
import { ITEM_BLENDItems } from "./items/byType/ITEM_BLEND";
import { ITEM_BUFFIItems } from "./items/byType/ITEM_BUFFI";
import { ITEM_COSTUMEItems } from "./items/byType/ITEM_COSTUME";
import { ITEM_DSItems } from "./items/byType/ITEM_DS";
import { ITEM_GACHAItems } from "./items/byType/ITEM_GACHA";
import { ITEM_GIFTBOXItems } from "./items/byType/ITEM_GIFTBOX";
import { ITEM_MATERIALItems } from "./items/byType/ITEM_MATERIAL";
import { ITEM_METINItems } from "./items/byType/ITEM_METIN";
import { ITEM_NONEItems } from "./items/byType/ITEM_NONE";
import { ITEM_PICKItems } from "./items/byType/ITEM_PICK";
import { ITEM_QUESTItems } from "./items/byType/ITEM_QUEST";
import { ITEM_RESOURCEItems } from "./items/byType/ITEM_RESOURCE";
import { ITEM_RINGItems } from "./items/byType/ITEM_RING";
import { ITEM_SKILLBOOKItems } from "./items/byType/ITEM_SKILLBOOK";
import { ITEM_SPECIALItems } from "./items/byType/ITEM_SPECIAL";
import { ITEM_UNIQUEItems } from "./items/byType/ITEM_UNIQUE";
import { ITEM_USEItems } from "./items/byType/ITEM_USE";
import { ITEM_WEAPONItems } from "./items/byType/ITEM_WEAPON";

export const items: Item[] = [
  ...ITEM_ARMORItems,
  ...ITEM_BELTItems,
  ...ITEM_BLENDItems,
  ...ITEM_BUFFIItems,
  ...ITEM_COSTUMEItems,
  ...ITEM_DSItems,
  ...ITEM_GACHAItems,
  ...ITEM_GIFTBOXItems,
  ...ITEM_MATERIALItems,
  ...ITEM_METINItems,
  ...ITEM_NONEItems,
  ...ITEM_PICKItems,
  ...ITEM_QUESTItems,
  ...ITEM_RESOURCEItems,
  ...ITEM_RINGItems,
  ...ITEM_SKILLBOOKItems,
  ...ITEM_SPECIALItems,
  ...ITEM_UNIQUEItems,
  ...ITEM_USEItems,
  ...ITEM_WEAPONItems,
];

export const itemById = Object.fromEntries(items.map((item) => [item.vnum, item]));
