-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_landlordId_connectionId_name_key" ON "BankAccount"("landlordId", "connectionId", "name");
