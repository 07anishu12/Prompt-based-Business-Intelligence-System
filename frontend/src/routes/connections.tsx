import { useEffect } from "react";
import { Database, Plus, Trash2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { useConnectionStore } from "@/stores/connectionStore";
import { toast } from "@/components/shared/Toast";

export default function ConnectionsPage() {
  const { connections, isLoading, fetchConnections, deleteConnection, testConnection, syncConnection } =
    useConnectionStore();

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleTest = async (id: string) => {
    try {
      const result = await testConnection(id);
      toast(result.success ? "success" : "error", result.message);
    } catch {
      toast("error", "Connection test failed");
    }
  };

  const handleSync = async (id: string) => {
    try {
      await syncConnection(id);
      toast("success", "Schema synced");
    } catch {
      toast("error", "Sync failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this connection?")) return;
    try {
      await deleteConnection(id);
      toast("success", "Connection deleted");
    } catch {
      toast("error", "Failed to delete");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connections
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your data source connections
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => toast("info", "Connection form coming in Prompt 14")}
        >
          <Plus size={18} />
          New Connection
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-20 dark:border-gray-700">
          <Database size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No connections yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect a data source to start querying
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Database size={20} className="text-gray-500" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{c.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                      {c.type}
                    </span>
                    <span className="flex items-center gap-1">
                      {c.status === "active" ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <XCircle size={12} className="text-red-500" />
                      )}
                      {c.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(c.id)}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Test
                </button>
                <button
                  onClick={() => handleSync(c.id)}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="rounded-lg p-1.5 text-gray-500 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
