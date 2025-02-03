import Head from 'next/head'
import styles from './styles.module.css'
import { GetServerSideProps } from 'next'
import { db } from '@/services/firebaseConnection'
import { doc, collection, query, where, getDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore'
import { Textarea } from '../../components/textarea'
import { ChangeEvent, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FaTrash } from 'react-icons/fa'

interface TaskProps {
    item: {
        tarefa: string
        public: boolean
        created: string
        user: string
        taskId: string
    },
    allComments: CommentProps[]
}

interface CommentProps {
    id: string
    comment: string
    taskId: string
    user: string
    name: string
}

export default function Task({ item, allComments }: TaskProps) {

    const { data: session } = useSession()

    const [input, setInput] = useState('')
    const [comments, setComments] = useState<CommentProps[]>(allComments || [])

    async function handleComment(event: ChangeEvent<HTMLFormElement>) {
        event.preventDefault()

        if (input === '') return

        if (!session?.user?.email || !session.user?.name) return

        try {
            const docRef = await addDoc(collection(db, 'comments'), {
                comentario: input,
                user: session?.user?.email,
                created: new Date(),
                name: session?.user?.name,
                taskId: item?.taskId
            })

            const data = {
                id: docRef.id,
                comment: input,
                taskId: item?.taskId,
                user: session?.user?.email,
                name: session?.user?.name
            }

            setComments((oldComments) => [...oldComments, data])

            setInput('')
        }
        catch (err) {
            console.log(err)
        }
    }

    async function handleDeleteComment(id: string) {
        try {
            const docRef = doc(db, 'comments', id)
            await deleteDoc(docRef)
            const commentsFiltered = comments.filter(comment => comment.id !== id)
            setComments(commentsFiltered)
        }
        catch (err) {
            console.log(err)
        }
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Tarefa+ | Detalhes da tarefa</title>
            </Head>

            <main className={styles.main}>
                <h1>Tarefa</h1>
                <article className={styles.task}>
                    <p>{item.tarefa}</p>

                </article>

                <section className={styles.commentsContainer}>
                    <h2>Deixar comentário</h2>
                    <form onSubmit={handleComment}>
                        <Textarea value={input} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)} placeholder='Escreva seu comentário...' />
                        <button disabled={!session} className={styles.button} type='submit'>Enviar comentário</button>
                    </form>
                </section>

                <section className={styles.commentsContainer}>
                    <h2>Todos os comentários</h2>
                    {comments.length === 0 && (
                        <p>Nenhum comentário foi encontrado...</p>
                    )}

                    {comments.map((comment) => (
                        <article key={comment.id} className={styles.comment}>
                            <div className={styles.headComment}>
                                <label className={styles.commentsLabel}>{comment.name}</label>
                                {
                                    session?.user?.email === comment?.user && (
                                        <button className={styles.buttonTrash} onClick={() => handleDeleteComment(comment.id)}>
                                            <FaTrash size={18} color='#ea3140' />
                                        </button>
                                    )
                                }
                            </div>
                            <p>{comment.comment}</p>
                        </article>
                    ))}
                </section>

            </main>

        </div>
    )
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
    const id = params?.id as string;

    const docRef = doc(db, 'tarefas', id)

    const q = query(collection(db, 'comments'), where('taskId', '==', id))

    const snapshotsComments = await getDocs(q)

    const allComments: CommentProps[] = []

    snapshotsComments.forEach((doc) => {
        allComments.push({
            id: doc.id,
            comment: doc.data().comentario,
            taskId: doc.data().taskId,
            user: doc.data().user,
            name: doc.data().name
        })
    })

    const snapshot = await getDoc(docRef)

    if (!snapshot.data()) {
        return {
            redirect: {
                destination: '/dashboard',
                permanent: false
            }
        }
    }

    if (!snapshot.data()?.public) {
        return {
            redirect: {
                destination: '/',
                permanent: false
            }
        }
    }

    const miliseconds = snapshot.data()?.created.seconds * 1000

    const task = {
        tarefa: snapshot.data()?.tarefa,
        public: snapshot.data()?.public,
        created: new Date(miliseconds).toLocaleString(),
        user: snapshot.data()?.user,
        taskId: id
    }

    return {
        props: {
            item: task,
            allComments: allComments,
        }
    }
}