import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_CONSTRAINT_RULES } from '@/lib/constraint-rules-config';
import { LEAVE_TYPE_CATALOG } from '@/lib/leave-types-config';

const CATEGORY_BADGE: Record<string, 'info' | 'warning' | 'success'> = {
  validation: 'info',
  business: 'warning',
  compliance: 'success',
};

export default function PolicySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Policy Settings</h1>
        <p className="text-gray-500 mt-1">Configure leave policies and constraint rules for your organization</p>
      </div>

      {/* Leave Type Catalog */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Leave Types ({LEAVE_TYPE_CATALOG.length})</CardTitle>
            <Badge variant="info">System Catalog</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 pr-4 text-gray-500 font-medium">Code</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Quota</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Category</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium hidden md:table-cell">Carry Forward</th>
                  <th className="text-left py-3 pl-2 text-gray-500 font-medium hidden lg:table-cell">Encashment</th>
                </tr>
              </thead>
              <tbody>
                {LEAVE_TYPE_CATALOG.map((lt) => (
                  <tr key={lt.code} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-50 text-blue-700">
                        {lt.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-gray-900">{lt.name}</td>
                    <td className="py-2.5 px-2 text-gray-700 font-medium">{lt.defaultQuota} days</td>
                    <td className="py-2.5 px-2">
                      <Badge variant={lt.category === 'statutory' ? 'warning' : lt.category === 'special' ? 'success' : 'default'}>
                        {lt.category}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2 hidden md:table-cell">
                      {lt.carryForward ? (
                        <span className="text-green-600 text-xs font-medium">
                          ✓ Up to {lt.maxCarryForward} days
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-2 hidden lg:table-cell">
                      {lt.encashmentEnabled ? (
                        <span className="text-green-600 text-xs font-medium">
                          ✓ Up to {lt.encashmentMaxDays} days
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Constraint Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Constraint Rules ({DEFAULT_CONSTRAINT_RULES.length})</CardTitle>
            <Badge variant="warning">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DEFAULT_CONSTRAINT_RULES.map((rule) => (
              <div
                key={rule.rule_id}
                className="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">{rule.rule_id}</span>
                    <p className="text-sm font-semibold text-gray-900">{rule.name}</p>
                    <Badge variant={CATEGORY_BADGE[rule.category]}>{rule.category}</Badge>
                    {rule.is_blocking && (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        Blocking
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                </div>
                <div className="ml-4 shrink-0">
                  <span className="text-xs text-gray-400">Priority {rule.priority}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            💡 Constraint rules are evaluated by the Python constraint engine before every leave request is submitted.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
