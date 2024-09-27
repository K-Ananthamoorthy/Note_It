'use client'

import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Database, User, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

type UserData = {
  uid: string
  email: string
  displayName: string
  role: 'user' | 'admin'
}

export default function AdminDashboard() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [userCount, setUserCount] = useState(0)
  const [noteCount, setNoteCount] = useState(0)
  const [careLogCount, setCareLogCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.email!)
          const userSnap = await getDoc(userRef)

          if (userSnap.exists()) {
            const userData = userSnap.data() as UserData
            if (userData.role === 'admin') {
              setUser(userData)
              await fetchStats()
            } else {
              router.push('/')
            }
          } else {
            router.push('/')
          }
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error("Error fetching user data: ", error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchStats = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'))
      setUserCount(usersSnapshot.size)

      const notesPromises = usersSnapshot.docs.map(async (userDoc) => {
        const notesSnapshot = await getDocs(collection(db, `users/${userDoc.id}/notes`))
        const careLogsSnapshot = await getDocs(collection(db, `users/${userDoc.id}/care`))
        return { notesSize: notesSnapshot.size, careLogsSize: careLogsSnapshot.size }
      })

      const results = await Promise.all(notesPromises)
      const totalNotes = results.reduce((sum, result) => sum + result.notesSize, 0)
      const totalCareLogs = results.reduce((sum, result) => sum + result.careLogsSize, 0)

      setNoteCount(totalNotes)
      setCareLogCount(totalCareLogs)
    } catch (error) {
      console.error("Error fetching stats: ", error)
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (!user || user.role !== 'admin') {
    return <div className="container mx-auto px-4 py-8">Access Denied</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Button onClick={() => router.push('/')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Main App
        </Button>
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-6 h-6 mr-2" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{userCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-6 h-6 mr-2" />
                Total Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{noteCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-6 h-6 mr-2" />
                Total Care Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{careLogCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
