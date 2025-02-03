import { Textarea } from '@/components/textarea';
import styles from './styles.module.css';
import { GetServerSideProps, Metadata } from 'next';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import { FiShare2 } from 'react-icons/fi'
import { FaTrash } from 'react-icons/fa'
import { ChangeEvent, useState, useEffect } from 'react';
import { db } from '../../services/firebaseConnection'
import { addDoc, collection, query, orderBy, onSnapshot, where, doc, deleteDoc } from 'firebase/firestore'
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Meu painel de tarefas',
    description: 'Painel de controle do usuário',
};

interface HomeProps {
    user: {
        email: string;
    }
}

interface TaskProps {
    id: string;
    created: Date;
    tarefa: string;
    public: boolean;
    user: string;
}

export default function Dashboard({ user }: HomeProps) {
    const [input, setInput] = useState("")
    const [publicTask, setPublicTask] = useState(false)
    const [tasks, setTasks] = useState<TaskProps[]>([])

    useEffect(() => {
        async function loadTarefas() {
            const tarefasRef = collection(db, 'tarefas')

            const q = query(
                tarefasRef,
                orderBy('created', 'desc'),
                where('user', '==', user?.email)
            )

            onSnapshot(q, (snapshot) => {
                let lista = [] as TaskProps[]
                snapshot.forEach((doc) => {
                    lista.push({
                        id: doc.id,
                        created: doc.data().created,
                        tarefa: doc.data().tarefa,
                        public: doc.data().public,
                        user: doc.data().user,
                    })
                })
                setTasks(lista)
            })

        }

        loadTarefas()
    }, [user?.email])

    function handleChangePublic(event: ChangeEvent<HTMLInputElement>) {
        setPublicTask(event.target.checked)
    }

    async function handleRegisterTask(event: ChangeEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!input) return

        try {
            await addDoc(collection(db, 'tarefas'), {
                tarefa: input,
                created: new Date(),
                public: publicTask,
                user: user?.email,
            })

            setInput('')
            setPublicTask(false)
        } catch (err) {
            console.log(err)
        }
    }

    async function handleShareTask(id: string) {
        await navigator.clipboard.writeText(
            `${process.env.NEXT_PUBLIC_URL}/task/${id}`
        )
    }

    async function handleDeleteTask(id: string) {
        const docRef = doc(db, 'tarefas', id)
        await deleteDoc(docRef)
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Meu painel de tarefas</title>
            </Head>

            <main className={styles.main}>
                <section className={styles.content}>
                    <div className={styles.contentForm}>
                        <h1 className={styles.title}>Qual sua tarefa?</h1>
                        <form onSubmit={handleRegisterTask}>
                            <Textarea
                                value={input}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                                placeholder='Digite sua tarefa...' />
                            <div className={styles.checkboxArea}>
                                <input
                                    checked={publicTask}
                                    onChange={handleChangePublic}
                                    type="checkbox"
                                    name="task"
                                    id="task"
                                    className={styles.checkbox}
                                />
                                <label htmlFor="task">Deixar tarefa publica?</label>
                            </div>

                            <button type="submit" className={styles.button}>Registrar</button>
                        </form>
                    </div>
                </section>

                <section className={styles.taskContainer}>
                    <div className={styles.contentList}>
                        <h1>Minhas tarefas</h1>
                        {
                            tasks.map((task) => {
                                return (
                                    <article key={task.id} className={styles.task}>

                                        {task.public && (
                                            <div className={styles.tagContainer}>
                                                <span className={styles.tag}>PUBLICO</span>
                                                <button className={styles.shareButton} onClick={() => handleShareTask(task.id)}>
                                                    <FiShare2 size={22} color="#3183ff" />
                                                </button>
                                            </div>
                                        )}

                                        <div className={styles.taskContent}>
                                            {task.public ? (
                                                <Link href={`/task/${task.id}`}>
                                                    <p>{task.tarefa}</p>
                                                </Link>
                                            ) : (
                                                <p>{task.tarefa}</p>
                                            )}
                                            <button className={styles.trashButton} onClick={() => handleDeleteTask(task.id)}>
                                                <FaTrash size={24} color="#ea3140" />
                                            </button>
                                        </div>
                                    </article>
                                )
                            })
                        }
                    </div>
                </section>
            </main>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
    const session = await getSession({ req });

    if (!session?.user) {
        return {
            redirect: {
                destination: '/',
                permanent: false,
            }
        }
    }

    return {
        props: {
            user: {
                email: session?.user?.email,
            }
        }
    }
}