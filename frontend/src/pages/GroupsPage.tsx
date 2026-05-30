import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { groupApi } from '../lib/api';
import { Layout, Card, Button, Input } from '../components/Layout';

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    daily_goal: 2,
    weekly_goal: 20,
  });
  const [joinCode, setJoinCode] = useState('');

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupApi.list().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => groupApi.create(createForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowCreate(false);
      setCreateForm({ name: '', description: '', daily_goal: 2, weekly_goal: 20 });
    },
  });

  const joinMutation = useMutation({
    mutationFn: () => groupApi.join(joinCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowJoin(false);
      setJoinCode('');
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Groups</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowJoin(true)}>
              Join Group
            </Button>
            <Button onClick={() => setShowCreate(true)}>Create Group</Button>
          </div>
        </div>

        {showCreate && (
          <Card>
            <h2 className="text-lg font-semibold mb-4">Create Accountability Group</h2>
            <div className="space-y-4">
              <Input
                label="Group Name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="DSA Grind Squad"
              />
              <Input
                label="Description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Daily accountability group"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Daily Goal"
                  type="number"
                  min={1}
                  value={createForm.daily_goal}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, daily_goal: parseInt(e.target.value) })
                  }
                />
                <Input
                  label="Weekly Goal"
                  type="number"
                  min={1}
                  value={createForm.weekly_goal}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, weekly_goal: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!createForm.name || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
                <Button variant="secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {showJoin && (
          <Card>
            <h2 className="text-lg font-semibold mb-4">Join Group</h2>
            <div className="space-y-4">
              <Input
                label="Group Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
              />
              {joinMutation.isError && (
                <p className="text-red-400 text-sm">Invalid group code or already a member.</p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => joinMutation.mutate()}
                  disabled={!joinCode || joinMutation.isPending}
                >
                  {joinMutation.isPending ? 'Joining...' : 'Join'}
                </Button>
                <Button variant="secondary" onClick={() => setShowJoin(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : groups?.length === 0 ? (
          <Card>
            <p className="text-gray-400 text-center py-8">
              No groups yet. Create one or join with a group code.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {groups?.map((group) => (
              <Link key={group.id} to={`/groups/${group.id}`}>
                <Card className="hover:border-indigo-500/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-100">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-gray-400 mt-1">{group.description}</p>
                      )}
                    </div>
                    <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded font-mono">
                      {group.group_code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    {group.member_count ?? 0} members
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
