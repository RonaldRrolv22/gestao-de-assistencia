/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  User,
  Client,
  ProductCatalog,
  ServiceCatalog,
  TechnicalProduct,
  MaintenanceRequest,
  AppNotification,
} from "../types";
import {
  subscribeToUsers,
  subscribeToClients,
  subscribeToProducts,
  subscribeToServices,
  subscribeToTechnicalProducts,
  subscribeToRequests,
  subscribeToNotifications,
} from "../services/firestoreService";

export function useAppData(enabled: boolean) {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<ProductCatalog[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<ServiceCatalog[]>([]);
  const [technicalProducts, setTechnicalProducts] = useState<TechnicalProduct[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= 7) setLoading(false);
    };

    const unsubs = [
      subscribeToUsers((data) => { setUsers(data); markLoaded(); }),
      subscribeToClients((data) => { setClients(data); markLoaded(); }),
      subscribeToProducts((data) => { setProductsCatalog(data); markLoaded(); }),
      subscribeToServices((data) => { setServicesCatalog(data); markLoaded(); }),
      subscribeToTechnicalProducts((data) => { setTechnicalProducts(data); markLoaded(); }),
      subscribeToRequests((data) => { setRequests(data); markLoaded(); }),
      subscribeToNotifications((data) => { setNotifications(data); markLoaded(); }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [enabled]);

  return {
    users,
    clients,
    productsCatalog,
    servicesCatalog,
    technicalProducts,
    requests,
    notifications,
    loading,
  };
}
