'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { AlertCreationModal } from '@/components/alert-creation-modal';
import { 
  AlertCircle, 
  Plus, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Search,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Alert {
  id: string;
  symbol: string;
  asset_name: string;
  asset_type: string;
  alert_type: 'price_above' | 'price_below' | 'percentage_move';
  threshold_value: number;
  is_active: boolean;
  is_enabled: boolean;
  last_triggered: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

export default function AlertsPage() {
  const { data: session, status } = useSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'price_above' | 'price_below' | 'percentage_move'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [editThreshold, setEditThreshold] = useState('');

  // Load alerts
  useEffect(() => {
    if (session?.user && status === 'authenticated') {
      loadAlerts();
    }
  }, [session?.user, status]);

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to load alerts:', errorData);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete alert');
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      alert('Failed to delete alert');
    }
  };

  const handleToggleEnabled = async (alertId: string, isEnabled: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_enabled: isEnabled,
        }),
      });

      if (response.ok) {
        setAlerts(alerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, is_enabled: isEnabled }
            : alert
        ));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update alert');
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      alert('Failed to update alert');
    }
  };

  const handleEditThreshold = async (alertId: string, newThreshold: string) => {
    const threshold = parseFloat(newThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      alert('Invalid threshold value');
      return;
    }

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threshold_value: threshold,
        }),
      });

      if (response.ok) {
        setAlerts(alerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, threshold_value: threshold }
            : alert
        ));
        setEditingAlert(null);
        setEditThreshold('');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update alert');
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      alert('Failed to update alert');
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'price_above':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'price_below':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'percentage_move':
        return <DollarSign className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getAlertTypeLabel = (alertType: string) => {
    switch (alertType) {
      case 'price_above':
        return 'Price Above';
      case 'price_below':
        return 'Price Below';
      case 'percentage_move':
        return 'Percentage Move';
      default:
        return alertType;
    }
  };

  const getAlertDescription = (alert: Alert) => {
    const assetName = alert.asset_name || alert.symbol;
    switch (alert.alert_type) {
      case 'price_above':
        return `Get notified when ${assetName} goes above $${alert.threshold_value}`;
      case 'price_below':
        return `Get notified when ${assetName} goes below $${alert.threshold_value}`;
      case 'percentage_move':
        return `Get notified when ${assetName} moves ${alert.threshold_value}% in a day`;
      default:
        return '';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.asset_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || alert.alert_type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (status === 'loading' || isLoading) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {status === 'loading' ? 'Loading session...' : 'Loading alerts...'}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Please sign in</h2>
              <p className="text-muted-foreground mb-4">You need to be signed in to view your alerts.</p>
              <Button asChild>
                <a href="/auth/signin">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Price Alerts</h1>
          <p className="text-muted-foreground">
            Manage your price alerts and notifications
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Alert
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search alerts by symbol or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          <Button
            variant={filterType === 'price_above' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('price_above')}
          >
            Price Above
          </Button>
          <Button
            variant={filterType === 'price_below' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('price_below')}
          >
            Price Below
          </Button>
          <Button
            variant={filterType === 'percentage_move' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('percentage_move')}
          >
            % Move
          </Button>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || filterType !== 'all' 
                ? 'No alerts match your search criteria'
                : 'Create your first price alert to get started'
              }
            </p>
            {(!searchTerm && filterType === 'all') && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAlerts.map((alert) => (
            <Card key={alert.id} className={!alert.is_enabled ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getAlertIcon(alert.alert_type)}
                      <div>
                        <h3 className="font-semibold text-lg">{alert.symbol}</h3>
                        <p className="text-sm text-muted-foreground">
                          {alert.asset_name}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {getAlertTypeLabel(alert.alert_type)}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground mb-3">
                      {getAlertDescription(alert)}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Triggered: {alert.trigger_count} times
                      </span>
                      {alert.last_triggered && (
                        <span>
                          Last: {new Date(alert.last_triggered).toLocaleDateString()}
                        </span>
                      )}
                      <span>
                        Created: {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={alert.is_enabled}
                      onCheckedChange={(checked) => handleToggleEnabled(alert.id, checked)}
                    />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingAlert(alert);
                            setEditThreshold(alert.threshold_value.toString());
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Threshold
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Threshold Modal */}
      {editingAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Alert Threshold</CardTitle>
              <CardDescription>
                Update the threshold value for {editingAlert.symbol}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  {getAlertTypeLabel(editingAlert.alert_type)} Threshold
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={editingAlert.alert_type === 'percentage_move' ? 100 : undefined}
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(e.target.value)}
                  placeholder="Enter new threshold"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingAlert(null);
                    setEditThreshold('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleEditThreshold(editingAlert.id, editThreshold)}
                  className="flex-1"
                >
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Alert Modal */}
      <AlertCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        symbol=""
        currentPrice={0}
        onAlertCreated={loadAlerts}
      />
      </div>
    </>
  );
}
