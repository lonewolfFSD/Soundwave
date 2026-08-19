import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase'; 
import { ShieldBan, Copy, CheckCircle, AlertTriangle, Search } from 'lucide-react';

// Define the shape of your User data
interface AppUser {
  uid: string;
  name: string;
  email: string;
  tag: string;
  isBanned: boolean;
  fcmToken?: string;
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Fallback to doc.id if the uid field is missing inside the document
          return { ...data, uid: data.uid || doc.id } as AppUser;
        });
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
        alert("Failed to load users. Check your Firestore rules!");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const sendMassBroadcast = async () => {
    const message = window.prompt("Enter the message to broadcast to ALL Soundwave users:");
    if (!message) return;

    // Extract valid tokens from your local state
    const validTokens = users
      .map(u => u.fcmToken)
      .filter((token): token is string => Boolean(token && token.length > 5));

    if (validTokens.length === 0) {
      alert("No users have valid push notification tokens registered yet.");
      return;
    }

    try {
      // Call your Vercel Serverless Function
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: validTokens, message })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Message successfully sent to ${data.delivered} devices!`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Broadcast failed:", error);
      alert("Failed to send the broadcast. Check the console.");
    }
  };

  // Handle Banning / Unbanning
  const toggleBanStatus = async (user: AppUser) => {
    const confirmMessage = user.isBanned 
      ? `Unban ${user.name}?` 
      : `Are you sure you want to BAN ${user.name}?`;
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const newBannedState = !user.isBanned;
      const newTag = newBannedState ? "BANNED" : "Standard";

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        isBanned: newBannedState,
        tag: newTag
      });

      // Update Local UI State
      setUsers(users.map(u => 
        u.uid === user.uid ? { ...u, isBanned: newBannedState, tag: newTag } : u
      ));

    } catch (error) {
      console.error("Ban failed:", error);
      alert("Failed to update status. Are you logged in as Admin?");
    }
  };

  // Copy FCM Token for Push Notifications
  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    alert("Token copied! Paste this into the Firebase Console to send a message.");
  };

  if (loading) {
    return <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center">Loading Admin Panel...</div>;
  }

  // Filter users based on search input
  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#030303] text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Soundwave Dashboard</h1>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              type="text"
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-white/30 focus:bg-white/10 transition-all text-white placeholder:text-white/30"
              style={{ fontFamily: 'Space Grotesk' }}
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="p-4 font-medium text-white/50 text-sm">Name</th>
                  <th className="p-4 font-medium text-white/50 text-sm">Email / UID</th>
                  <th className="p-4 font-medium text-white/50 text-sm">Tag</th>
                  <th className="p-4 font-medium text-white/50 text-right text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${user.isBanned ? 'opacity-50 bg-red-950/10' : ''}`}>
                    
                    {/* Name */}
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-2">
                        {user.name}
                        {user.isBanned && <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-500 px-2 py-0.5 rounded-md">Banned</span>}
                      </div>
                    </td>

                    {/* Email & UID */}
                    <td className="p-4">
                      <div className="text-sm">{user.email}</div>
                      <div className="text-xs text-white/30 font-mono mt-1">{user.uid}</div>
                    </td>

                    {/* Tag */}
                    <td className="p-4">
                      <span className={`text-[11px] font-medium px-3 py-1 rounded-full border ${user.isBanned ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-zinc-300'}`}>
                        {user.tag}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right flex justify-end gap-2">
                      
                      {/* Send Notification Button */}
                      <button 
                        onClick={() => user.fcmToken ? copyToken(user.fcmToken) : alert("User hasn't generated an FCM token yet.")}
                        className={`p-2 rounded-lg transition-colors ${user.fcmToken ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                        title={user.fcmToken ? "Copy Token for Notification" : "No token available"}
                      >
                        {copiedToken === user.fcmToken ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>

                      {/* Ban / Unban Button */}
                      <button 
                        onClick={() => toggleBanStatus(user)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 
                          ${user.isBanned ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500'}`}
                      >
                        <ShieldBan className="w-4 h-4" />
                        {user.isBanned ? 'Unban' : 'Ban User'}
                      </button>

                    </td>
                  </tr>
                ))}
                
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-white/40 text-sm">
                      {searchTerm ? "No users match your search." : "No users found in database."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;