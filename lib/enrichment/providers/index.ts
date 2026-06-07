import { businessDataHealth } from "./businessDataProvider";
import { gbpHealth } from "./gbpProvider";
import { googleMapsHealth } from "./googleMapsProvider";
import { googlePlacesHealth } from "./googlePlacesProvider";
import { googleRoutesHealth } from "./googleRoutesProvider";
import { instagramResolverHealth } from "./instagramResolverProvider";
import { metaAdsSignalHealth } from "./metaAdsSignalProvider";
import { searchProviderHealth } from "./searchProvider";
import { statsConnectorHealth } from "./statsConnector";
import { websiteAuditHealth } from "./websiteAuditProvider";
import { whatsappHealth } from "./whatsappProvider";

export function listProviderHealth() {
  return [
    googlePlacesHealth(),
    googleMapsHealth(),
    googleRoutesHealth(),
    searchProviderHealth(),
    websiteAuditHealth(),
    businessDataHealth(),
    instagramResolverHealth(),
    metaAdsSignalHealth(),
    whatsappHealth(),
    gbpHealth(),
    statsConnectorHealth()
  ];
}
